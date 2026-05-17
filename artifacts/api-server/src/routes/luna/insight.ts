import { Router } from "express";
import { db, lunaLogsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  getOrGenerateInsight,
  generateInsight,
  getTodayUpdates,
  generateCycleLogInsight,
} from "../../services/luna.js";
import { logger } from "../../lib/logger.js";
import { z } from "zod";

const router = Router();

const SaveLogBody = z.object({
  userId: z.string(),
  date: z.string(),
  cyclePhase: z.string(),
  dayOfCycle: z.number().optional(),
  mood: z.string(),
  symptoms: z.array(z.string()).default([]),
});

const InsightBody = z.object({ userId: z.string() });

// ── POST /log ─────────────────────────────────────────────────────────────────
router.post("/log", async (req, res) => {
  const parsed = SaveLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const data = parsed.data;

  // Deduplication: if the latest log for today already has identical mood,
  // phase, and symptoms, skip the insert to avoid spurious cache invalidation
  // and unnecessary Gemini regeneration.
  try {
    const [latestToday] = await db
      .select()
      .from(lunaLogsTable)
      .where(and(eq(lunaLogsTable.userId, data.userId), eq(lunaLogsTable.date, data.date)))
      .orderBy(desc(lunaLogsTable.createdAt))
      .limit(1);

    if (
      latestToday &&
      latestToday.mood === data.mood &&
      latestToday.cyclePhase === data.cyclePhase &&
      JSON.stringify(latestToday.symptoms) === JSON.stringify(data.symptoms)
    ) {
      res.status(200).json({ log: latestToday, duplicate: true });
      return;
    }
  } catch (err) {
    logger.warn({ err }, "Dedup check failed — proceeding with insert");
  }

  let saved: typeof lunaLogsTable.$inferSelect | undefined;
  try {
    [saved] = await db
      .insert(lunaLogsTable)
      .values({
        userId:      data.userId,
        date:        data.date,
        cyclePhase:  data.cyclePhase,
        dayOfCycle:  data.dayOfCycle ?? null,
        mood:        data.mood,
        symptoms:    data.symptoms,
      })
      .returning();
  } catch (err) {
    logger.error({ err }, "DB error saving log");
    res.status(500).json({ error: "Failed to save log" });
    return;
  }

  // Logging is intentionally separated from insight generation.
  // Insights are only generated when the user opens the dashboard.
  res.status(201).json({ log: saved });
});

// ── GET /logs/:userId ─────────────────────────────────────────────────────────
router.get("/logs/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  try {
    const logs = await db
      .select()
      .from(lunaLogsTable)
      .where(eq(lunaLogsTable.userId, userId))
      .orderBy(desc(lunaLogsTable.date));
    res.json(logs);
  } catch (err) {
    logger.error({ err, userId }, "DB error fetching logs");
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// ── GET /today-insight/:userId ────────────────────────────────────────────────
// Returns cached insight if it exists. If not, checks for today's logs:
//   - logs found  → generates insight now, caches it, returns it
//   - no logs     → returns { insight: null, hasLogs: false } (no Gemini call)
//
// Cache-Control: no-store prevents the browser and any intermediate proxy from
// caching this response. The insight must always hit the route handler so that
// getOrGenerateInsight() can detect new logs and regenerate when needed.
router.get("/today-insight/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  res.set("Cache-Control", "no-store");
  try {
    const result = await getOrGenerateInsight(userId);
    res.json(result);
  } catch (err) {
    logger.error({ err, userId }, "today-insight error");
    res.json({ insight: null, hasLogs: false });
  }
});

// ── GET /today-updates/:userId ────────────────────────────────────────────────
router.get("/today-updates/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  res.set("Cache-Control", "no-store");
  try {
    const updates = await getTodayUpdates(userId);
    res.json({ updates });
  } catch (err) {
    logger.error({ err, userId }, "DB error fetching today updates");
    res.json({ updates: [] });
  }
});

// ── POST /cycle-log-insight ───────────────────────────────────────────────────
const CycleLogInsightBody = z.object({
  userId: z.string(),
  mood: z.string().nullable().optional(),
  flow: z.string(),
  date: z.string(),
  cyclePhase: z.string(),
  dayOfCycle: z.number().nullable().optional(),
  symptoms: z.array(z.string()).default([]),
});

router.post("/cycle-log-insight", async (req, res) => {
  const parsed = CycleLogInsightBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  try {
    const result = await generateCycleLogInsight({
      ...parsed.data,
      mood: parsed.data.mood ?? null,
      dayOfCycle: parsed.data.dayOfCycle ?? null,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "cycle-log-insight error");
    res.status(500).json({ error: "Failed to generate insight" });
  }
});

// ── POST /generate-insight ────────────────────────────────────────────────────
router.post("/generate-insight", async (req, res) => {
  const parsed = InsightBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "userId required" }); return; }
  try {
    const result = await generateInsight(parsed.data.userId);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Insight generation failed");
    const status = (err as { status?: number })?.status === 429 ? 429 : 500;
    const message = status === 429
      ? "Luna is resting for a moment. Please try again shortly."
      : "Luna couldn't generate an insight right now.";
    res.status(status).json({ error: status === 429 ? "rate_limit" : "ai_error", message });
  }
});

export default router;
