import { Router } from "express";
import { db, lunaLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  generateInsight,
  getTodayInsight,
  getTodayUpdates,
  processDailyUpdate,
} from "../../services/luna.js";
import { logger } from "../../lib/logger.js";
import { isRateLimit } from "../../lib/gemini.js";
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

  let dailyUpdate: { text: string; severity: string } | null = null;
  try {
    const existingInsight = await getTodayInsight(data.userId);
    if (existingInsight && !existingInsight.isEncouragement) {
      dailyUpdate = await processDailyUpdate(
        data.userId,
        {
          mood:        data.mood,
          cyclePhase:  data.cyclePhase,
          symptoms:    data.symptoms,
          dayOfCycle:  data.dayOfCycle ?? null,
          date:        data.date,
        },
        existingInsight,
      );
    }
  } catch (err) {
    // Non-critical — log saved regardless
    logger.warn({ err }, "Daily update failed — log was still saved");
  }

  res.status(201).json({ log: saved, update: dailyUpdate });
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
router.get("/today-insight/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  try {
    const insight = await getTodayInsight(userId);
    res.json({ insight });
  } catch (err) {
    logger.error({ err, userId }, "DB error fetching today insight");
    res.json({ insight: null });
  }
});

// ── GET /today-updates/:userId ────────────────────────────────────────────────
router.get("/today-updates/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  try {
    const updates = await getTodayUpdates(userId);
    res.json({ updates });
  } catch (err) {
    logger.error({ err, userId }, "DB error fetching today updates");
    res.json({ updates: [] });
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
    if (isRateLimit(err)) {
      res.status(429).json({
        error: "rate_limit",
        message: "Luna is resting for a moment. Please try again shortly.",
      });
    } else {
      res.status(500).json({
        error:   "ai_error",
        message: "Luna couldn't generate an insight right now.",
      });
    }
  }
});

export default router;
