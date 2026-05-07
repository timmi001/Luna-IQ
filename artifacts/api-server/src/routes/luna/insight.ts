import { Router } from "express";
import { db, lunaLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  generateInsight,
  getTodayInsight,
  getTodayUpdates,
  processDailyUpdate,
} from "../../services/luna.js";
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

function isRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
}

// ── POST /log — save log, trigger same-day update if insight exists ────────────
router.post("/log", async (req, res) => {
  const parsed = SaveLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const data = parsed.data;

  const [saved] = await db
    .insert(lunaLogsTable)
    .values({
      userId: data.userId,
      date: data.date,
      cyclePhase: data.cyclePhase,
      dayOfCycle: data.dayOfCycle ?? null,
      mood: data.mood,
      symptoms: data.symptoms,
    })
    .returning();

  const existingInsight = await getTodayInsight(data.userId);
  let dailyUpdate: { text: string; severity: string } | null = null;

  if (existingInsight && !existingInsight.isEncouragement) {
    try {
      dailyUpdate = await processDailyUpdate(
        data.userId,
        {
          mood: data.mood,
          cyclePhase: data.cyclePhase,
          symptoms: data.symptoms,
          dayOfCycle: data.dayOfCycle ?? null,
          date: data.date,
        },
        existingInsight,
      );
    } catch {
      // Non-critical — log saved regardless
    }
  }

  res.status(201).json({ log: saved, update: dailyUpdate });
});

// ── GET /logs/:userId ──────────────────────────────────────────────────────────
router.get("/logs/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const logs = await db
    .select()
    .from(lunaLogsTable)
    .where(eq(lunaLogsTable.userId, userId))
    .orderBy(desc(lunaLogsTable.date));
  res.json(logs);
});

// ── GET /today-insight/:userId — return cached insight or null ─────────────────
router.get("/today-insight/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const insight = await getTodayInsight(userId);
  res.json({ insight });
});

// ── GET /today-updates/:userId — return same-day updates ──────────────────────
router.get("/today-updates/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  const updates = await getTodayUpdates(userId);
  res.json({ updates });
});

// ── POST /generate-insight — generate (or return cached) daily insight ─────────
// Daily caching is enforced HERE only. Chat is not affected by this limit.
router.post("/generate-insight", async (req, res) => {
  const parsed = InsightBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "userId required" });
    return;
  }
  try {
    const result = await generateInsight(parsed.data.userId);
    res.json(result);
  } catch (err) {
    if (isRateLimit(err)) {
      res.status(429).json({
        error: "rate_limit",
        message: "Luna is resting for a moment. Please try again shortly.",
      });
    } else {
      res.status(500).json({
        error: "ai_error",
        message: "Luna couldn't generate an insight right now.",
      });
    }
  }
});

export default router;
