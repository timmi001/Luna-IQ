import { getGenAI, withTimeout, withRetry } from "../lib/gemini.js";
import { logger } from "../lib/logger.js";
import { db, lunaLogsTable, lunaInsightsTable, lunaDailyUpdatesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

export const LUNA_SYSTEM_PROMPT = `You are Luna, a gentle and emotionally intelligent wellness companion designed for women in Nigeria and Africa. You help users understand their menstrual cycle, mood patterns, and body signals.

Your tone should be:
- Simple and clear — no complicated words or medical jargon
- Warm and supportive — like a trusted older sister or close friend
- Culturally relatable — acknowledge the real daily realities of African women (busy schedules, family demands, limited time for self-care)
- Practical — suggestions should fit everyday life, not unrealistic western wellness trends

Your personality:
- Speak like a caring friend, not a doctor
- Always validate feelings first before offering insights
- Use first-person warmth ("I notice...", "It sounds like...", "I hear you...")
- Keep responses concise (2-4 sentences max per section)

Avoid:
- Medical jargon or clinical language
- Expensive or hard-to-find wellness products
- Overly western or foreign references that don't fit African daily life
- Being preachy or lecturing

Make suggestions that are realistic: a short walk, drinking more water, resting when possible, eating local nourishing foods, breathing deeply — things women can actually do even with a full, busy day.

IMPORTANT RULES:
- Never give medical diagnoses or prescriptions
- Always remind users you are not a medical professional when relevant
- Never be alarmist
- Focus on patterns, not predictions`;

// ── Types ──────────────────────────────────────────────────────────────────────

export type InsightResult = {
  insight: string;
  pattern: string | null;
  suggestion: string;
  reassurance: string;
  isEncouragement?: boolean;
};

export type DailyUpdateResult = {
  text: string;
  severity: "minor" | "significant";
};

type LogEntry = {
  mood: string;
  cyclePhase: string;
  symptoms: unknown;
  dayOfCycle?: number | null;
  date: string;
};

// ── Fallback insight returned when Gemini is unavailable ──────────────────────

const FALLBACK_INSIGHT: InsightResult = {
  insight: "I'm here with you. Your body is doing its best today. 💜",
  pattern: null,
  suggestion: "Drink some water, take a gentle breath, and be kind to yourself.",
  reassurance: "I'll have more personalised insights for you soon. 🌸",
};

// ── Mood severity ─────────────────────────────────────────────────────────────

const MOOD_SEVERITY: Record<string, number> = {
  "🌟 Radiant": 0,
  "😄 Happy": 1,
  "😌 Calm": 2,
  "😴 Tired": 3,
  "😢 Sad": 4,
  "😤 Irritated": 4,
  "😰 Anxious": 5,
};

function moodSeverity(mood: string): number {
  for (const [key, val] of Object.entries(MOOD_SEVERITY)) {
    if (mood.includes(key.split(" ")[1]!)) return val;
  }
  return 2;
}

const SEVERE_SYMPTOMS = new Set([
  "severe cramps", "heavy bleeding", "heavy flow", "migraine", "fainting",
  "vomiting", "fever", "severe pain", "chest pain", "dizziness",
]);

function isSevereSymptom(s: string): boolean {
  return SEVERE_SYMPTOMS.has(s.toLowerCase()) || s.toLowerCase().includes("severe");
}

// ── Pattern detection ─────────────────────────────────────────────────────────

function detectPatterns(logs: LogEntry[]): string {
  if (logs.length < 3) return "";
  const moodCounts: Record<string, number> = {};
  const symptomCounts: Record<string, number> = {};
  const phaseSymptoms: Record<string, string[]> = {};

  for (const log of logs) {
    moodCounts[log.mood] = (moodCounts[log.mood] ?? 0) + 1;
    const syms = Array.isArray(log.symptoms) ? (log.symptoms as string[]) : [];
    for (const s of syms) symptomCounts[s] = (symptomCounts[s] ?? 0) + 1;
    if (!phaseSymptoms[log.cyclePhase]) phaseSymptoms[log.cyclePhase] = [];
    phaseSymptoms[log.cyclePhase]!.push(...syms);
  }

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const repeatedSymptoms = Object.entries(symptomCounts).filter(([, c]) => c >= 2).map(([s]) => s);
  const parts: string[] = [];
  if (dominantMood) parts.push(`Dominant mood: ${dominantMood[0]} (${dominantMood[1]} times)`);
  if (repeatedSymptoms.length) parts.push(`Recurring symptoms: ${repeatedSymptoms.join(", ")}`);
  const phaseEntries = Object.entries(phaseSymptoms).filter(([, s]) => s.length > 0);
  if (phaseEntries.length) {
    parts.push(`Phase-specific: ${phaseEntries.map(([p, s]) => `${p}: ${[...new Set(s)].join(", ")}`).join(" | ")}`);
  }
  return parts.join(". ");
}

// ── Minor update messages ─────────────────────────────────────────────────────

const MINOR_UPDATES = [
  "Noted 💜 I'm keeping track of how you're doing.",
  "Take things gently today, my dear.",
  "Your body may need a little extra rest tonight.",
  "I hear you. Small steps today are more than enough.",
  "Thank you for checking in — I'm always here for you. 🌸",
  "Keep drinking water and being kind to yourself today.",
];

function pickMinorUpdate(log: LogEntry): string {
  const syms = Array.isArray(log.symptoms) ? (log.symptoms as string[]) : [];
  if (syms.length > 0) return "Noted 💜 I've logged your symptoms. Be gentle with yourself today.";
  const sev = moodSeverity(log.mood);
  if (sev >= 4) return "I hear you. Small steps today are more than enough. 💜";
  if (sev >= 3) return "Your body may need a little extra rest tonight. Take care, dear.";
  return MINOR_UPDATES[Math.floor(Math.random() * MINOR_UPDATES.length)]!;
}

// ── Significance detection ────────────────────────────────────────────────────

function detectChangeSignificance(prevLog: LogEntry | null, newLog: LogEntry): "minor" | "significant" {
  const newSyms = Array.isArray(newLog.symptoms) ? (newLog.symptoms as string[]) : [];
  const prevSyms = prevLog && Array.isArray(prevLog.symptoms) ? (prevLog.symptoms as string[]) : [];
  const addedSyms = newSyms.filter((s) => !prevSyms.includes(s));

  if (addedSyms.some(isSevereSymptom)) return "significant";
  if (addedSyms.length >= 3) return "significant";
  if (prevLog) {
    const prevSev = moodSeverity(prevLog.mood);
    const newSev = moodSeverity(newLog.mood);
    if (newSev - prevSev >= 2) return "significant";
  }
  return "minor";
}

// ── DB helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the most recent insight for today along with its generation timestamp.
 * Used to decide whether the cache is still valid relative to the latest log.
 */
async function getTodayInsightRow(
  userId: string,
): Promise<{ insight: InsightResult; createdAt: Date } | null> {
  const today = new Date().toISOString().split("T")[0]!;
  const rows = await db
    .select()
    .from(lunaInsightsTable)
    .where(and(eq(lunaInsightsTable.userId, userId), eq(lunaInsightsTable.date, today)))
    .orderBy(desc(lunaInsightsTable.createdAt))
    .limit(1);
  if (rows.length === 0) return null;
  return {
    insight: rows[0]!.insightData as InsightResult,
    createdAt: rows[0]!.createdAt,
  };
}

export async function getTodayInsight(userId: string): Promise<InsightResult | null> {
  const row = await getTodayInsightRow(userId);
  return row?.insight ?? null;
}

/**
 * Returns the createdAt timestamp of the most recent log for today.
 * Returns null if no logs exist yet.
 */
async function getLatestLogTime(userId: string): Promise<Date | null> {
  const today = new Date().toISOString().split("T")[0]!;
  try {
    const [row] = await db
      .select({ createdAt: lunaLogsTable.createdAt })
      .from(lunaLogsTable)
      .where(and(eq(lunaLogsTable.userId, userId), eq(lunaLogsTable.date, today)))
      .orderBy(desc(lunaLogsTable.createdAt))
      .limit(1);
    return row?.createdAt ?? null;
  } catch {
    return null;
  }
}

// ── Dashboard insight ─────────────────────────────────────────────────────────
// Regenerates whenever a log newer than the cached insight exists.
// This means logging mood after cycle automatically refreshes the insight.

export async function getOrGenerateInsight(
  userId: string,
): Promise<{ insight: InsightResult | null; hasLogs: boolean }> {
  const today = new Date().toISOString().split("T")[0]!;

  // 1. Fetch today's logs to determine if any exist and when the latest one was saved
  let todayLogs: typeof lunaLogsTable.$inferSelect[] = [];
  try {
    todayLogs = await db
      .select()
      .from(lunaLogsTable)
      .where(and(eq(lunaLogsTable.userId, userId), eq(lunaLogsTable.date, today)))
      .orderBy(desc(lunaLogsTable.createdAt))
      .limit(10);
  } catch (dbErr) {
    logger.error({ err: dbErr }, "DB error checking today's logs");
    return { insight: null, hasLogs: false };
  }

  // 2. No logs at all — nothing to generate from
  if (todayLogs.length === 0) {
    return { insight: null, hasLogs: false };
  }

  // 3. Check if a cached insight exists and whether it is still current
  let cachedRow: { insight: InsightResult; createdAt: Date } | null = null;
  try {
    cachedRow = await getTodayInsightRow(userId);
  } catch (dbErr) {
    logger.error({ err: dbErr }, "DB error reading cached insight");
  }

  const latestLogTime = todayLogs[0]!.createdAt;

  // Serve the cache only when it was generated AFTER the most recent log
  if (cachedRow && cachedRow.createdAt >= latestLogTime) {
    logger.info({ userId, insightAge: cachedRow.createdAt, latestLog: latestLogTime }, "Serving cached insight — still current");
    return { insight: cachedRow.insight, hasLogs: true };
  }

  // 4. New log(s) exist since the last insight (or no insight yet) — regenerate
  logger.info({ userId, insightAge: cachedRow?.createdAt, latestLog: latestLogTime }, "Regenerating insight — newer log detected");
  try {
    const insight = await generateInsight(userId);
    return { insight, hasLogs: true };
  } catch (err) {
    logger.error({ err, userId }, "getOrGenerateInsight: generation failed");
    // Return stale cache rather than nothing
    if (cachedRow) return { insight: cachedRow.insight, hasLogs: true };
    return { insight: null, hasLogs: true };
  }
}

export async function getTodayUpdates(userId: string): Promise<DailyUpdateResult[]> {
  const today = new Date().toISOString().split("T")[0]!;
  const rows = await db
    .select()
    .from(lunaDailyUpdatesTable)
    .where(and(eq(lunaDailyUpdatesTable.userId, userId), eq(lunaDailyUpdatesTable.date, today)))
    .orderBy(desc(lunaDailyUpdatesTable.createdAt));
  return rows.map((r) => ({ text: r.updateText, severity: r.severity as "minor" | "significant" }));
}

// ── In-flight deduplication — prevents concurrent Gemini calls per user ───────
const insightInFlight = new Map<string, Promise<InsightResult>>();

// ── Main insight generation ───────────────────────────────────────────────────

export async function generateInsight(userId: string): Promise<InsightResult> {
  // Only serve the cache if it was generated AFTER the latest log for today.
  // If a newer log exists, fall through and regenerate.
  try {
    const [cachedRow, latestLogTime] = await Promise.all([
      getTodayInsightRow(userId),
      getLatestLogTime(userId),
    ]);
    if (cachedRow && (!latestLogTime || cachedRow.createdAt >= latestLogTime)) {
      logger.info({ userId }, "generateInsight: cache still current — returning cached");
      return cachedRow.insight;
    }
  } catch (dbErr) {
    logger.error({ err: dbErr }, "DB error in generateInsight cache check");
  }

  // Dedup: if a generation is already in-flight for this user, share the promise
  const existing = insightInFlight.get(userId);
  if (existing) {
    logger.info({ userId }, "Insight already generating — reusing in-flight promise");
    return existing;
  }

  const promise = _generateInsightWork(userId).finally(() => {
    insightInFlight.delete(userId);
  });

  insightInFlight.set(userId, promise);
  return promise;
}

async function _generateInsightWork(userId: string): Promise<InsightResult> {
  const today = new Date().toISOString().split("T")[0]!;

  let logs: typeof lunaLogsTable.$inferSelect[] = [];
  try {
    logs = await db
      .select()
      .from(lunaLogsTable)
      .where(eq(lunaLogsTable.userId, userId))
      .orderBy(desc(lunaLogsTable.date))
      .limit(30);
  } catch (dbErr) {
    logger.error({ err: dbErr }, "DB error fetching logs for insight");
    return FALLBACK_INSIGHT;
  }

  if (logs.length === 0) {
    return {
      insight: "I'd love to understand how you're feeling today 💜",
      pattern: null,
      suggestion: "Log today's mood or symptoms so I can support you better.",
      reassurance: "Once you add today's log, I'll be able to give you personalised insights.",
      isEncouragement: true,
    };
  }

  const hasLogToday = logs.some((l) => l.date === today);
  if (!hasLogToday) {
    return {
      insight: "I see you've been on this journey for a while — that means a lot 💜",
      pattern: null,
      suggestion: "Add today's mood or cycle update so your insight stays fresh and accurate.",
      reassurance: "I'll be right here when you're ready to check in.",
      isEncouragement: true,
    };
  }

  // Use the most recent log for today as the "current" snapshot
  const latest = logs.find((l) => l.date === today) ?? logs[0]!;
  const patterns = detectPatterns(logs as LogEntry[]);
  const latestSymptoms = Array.isArray(latest.symptoms) ? (latest.symptoms as string[]) : [];

  const recentSummary = logs.slice(0, 7).map((l) => {
    const syms = Array.isArray(l.symptoms) ? (l.symptoms as string[]).join(", ") : "none";
    const moodDisplay = l.mood === "not_logged" ? "not checked in" : l.mood;
    return `• ${l.date} — Phase: ${l.cyclePhase} (Day ${l.dayOfCycle ?? "?"}) | Mood: ${moodDisplay} | Symptoms: ${syms || "none"}`;
  }).join("\n");

  const moodLoggedToday = latest.mood !== "not_logged";
  const phaseKnown = latest.cyclePhase !== "Not Set" && latest.cyclePhase !== "Unknown";
  const moodDisplay = moodLoggedToday ? latest.mood : "not checked in yet today";

  const prompt = `${LUNA_SYSTEM_PROMPT}

The user has been logging their health data. Use ALL of the information below to write a personalized, specific insight — not a generic one.

TODAY'S DATA:
- Cycle phase: ${phaseKnown ? `${latest.cyclePhase} (Day ${latest.dayOfCycle ?? "?"})` : "Cycle not set up yet"}
- Mood today: ${moodDisplay}
- Symptoms logged today: ${latestSymptoms.length ? latestSymptoms.join(", ") : "none"}
- Date: ${latest.date}

RECENT LOG HISTORY (last 7 entries):
${recentSummary}

DETECTED PATTERNS:
${patterns || "Not enough data for patterns yet — base insight on today's data."}

IMPORTANT RULES FOR THIS INSIGHT:
${!moodLoggedToday ? "- The user has NOT checked in with their mood today. Do NOT say what their mood is. Instead, gently acknowledge their cycle phase and invite them to log how they feel." : "- The user has logged their mood as: " + latest.mood + ". Acknowledge this mood by name and validate it."}
${!phaseKnown ? "- The user has not set up their cycle tracker yet. Focus on general wellness and gently encourage them to set up cycle tracking." : "- Mention the " + latest.cyclePhase + " phase by name and explain what that typically means for energy, emotions, or the body."}
- Reference specific things from their logs (symptoms, moods, phases) — never be generic
- If they have symptoms like cramps, bloating, fatigue — acknowledge it by name
- Keep suggestions simple and realistic for a busy African woman's daily life

Respond in this EXACT JSON format (no markdown, no extra text):
{
  "insight": "A warm, specific 2-3 sentence insight based on their actual data. If mood not logged today, focus on cycle phase. If cycle not set, focus on general wellness.",
  "pattern": "A specific pattern noticed from log history, or null if fewer than 3 logs",
  "suggestion": "One practical, simple self-care suggestion appropriate for their current phase and logged symptoms (1-2 sentences)",
  "reassurance": "A short, warm closing message in a relatable African tone (1 sentence, end with an emoji)"
}`;

  let result: InsightResult;
  try {
    const response = await withRetry(
      () => withTimeout(
        getGenAI().models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { maxOutputTokens: 4096, responseMimeType: "application/json" },
        }),
        30_000,
        "generateInsight",
      ),
      "generateInsight",
    );

    const text = response.text ?? "{}";
    const parsed = JSON.parse(text) as Partial<InsightResult>;
    result = {
      insight:     parsed.insight     ?? "I see you've been tracking your wellness journey.",
      pattern:     parsed.pattern     ?? null,
      suggestion:  parsed.suggestion  ?? "Take a moment to rest and listen to your body.",
      reassurance: parsed.reassurance ?? "You're doing great. 🌸",
    };
  } catch (err) {
    logger.error({ err, userId }, "Gemini insight generation failed");
    return {
      insight: "I'm here with you, my dear. I wasn't able to generate your full insight right now.",
      pattern: patterns || null,
      suggestion: "Take a gentle moment for yourself today. Drink some water and breathe.",
      reassurance: "I'll try again for you soon. 💜",
    };
  }

  // Replace any existing insight for today so there is always exactly one row per user per day
  try {
    await db
      .delete(lunaInsightsTable)
      .where(and(eq(lunaInsightsTable.userId, userId), eq(lunaInsightsTable.date, today)));
    await db.insert(lunaInsightsTable).values({ userId, date: today, insightData: result });
    logger.info({ userId, today }, "Insight regenerated and persisted");
  } catch (dbErr) {
    logger.error({ err: dbErr }, "DB error persisting insight — returning result anyway");
  }

  return result;
}

// ── Same-day update logic ─────────────────────────────────────────────────────

export async function processDailyUpdate(
  userId: string,
  newLog: LogEntry,
  existingInsight: InsightResult,
): Promise<DailyUpdateResult> {
  const today = new Date().toISOString().split("T")[0]!;

  let prevLogs: typeof lunaLogsTable.$inferSelect[] = [];
  try {
    prevLogs = await db
      .select()
      .from(lunaLogsTable)
      .where(and(eq(lunaLogsTable.userId, userId), eq(lunaLogsTable.date, today)))
      .orderBy(desc(lunaLogsTable.createdAt))
      .limit(2);
  } catch (dbErr) {
    logger.error({ err: dbErr }, "DB error fetching prev logs for daily update");
  }

  const prevLog = prevLogs.length >= 2 ? (prevLogs[1]! as unknown as LogEntry) : null;
  const severity = detectChangeSignificance(prevLog, newLog);

  let updateText: string;

  if (severity === "minor") {
    updateText = pickMinorUpdate(newLog);
  } else {
    const newSyms  = Array.isArray(newLog.symptoms)   ? (newLog.symptoms   as string[]) : [];
    const prevSyms = prevLog && Array.isArray(prevLog.symptoms) ? (prevLog.symptoms as string[]) : [];
    const addedSyms = newSyms.filter((s) => !prevSyms.includes(s));

    const changeDesc = [
      prevLog ? `Mood changed from ${prevLog.mood} to ${newLog.mood}` : `Current mood: ${newLog.mood}`,
      addedSyms.length ? `New symptoms added: ${addedSyms.join(", ")}` : null,
    ].filter(Boolean).join(". ");

    const prompt = `${LUNA_SYSTEM_PROMPT}

A user has just logged a significant wellness change during the day. Write a SHORT, warm, supportive update — 1 to 3 sentences only. Do NOT rewrite the full daily insight. Just acknowledge what changed and offer gentle encouragement.

Their existing today's insight already covers: "${existingInsight.insight}"

What changed now: ${changeDesc}
Current cycle phase: ${newLog.cyclePhase}

Rules:
- Very short (1-3 sentences max)
- Warm and personal
- Acknowledge the specific change by name
- No medical advice
- End with one emoji

Respond with ONLY the update text, no JSON, no markdown.`;

    try {
      const response = await withRetry(
        () => withTimeout(
          getGenAI().models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { maxOutputTokens: 512 },
          }),
          20_000,
          "processDailyUpdate",
        ),
        "processDailyUpdate",
      );
      updateText = response.text?.trim() ?? pickMinorUpdate(newLog);
    } catch (err) {
      logger.warn({ err, userId }, "Gemini daily update failed — using static fallback");
      updateText = "I noticed something changed for you today. Please be extra gentle with yourself. 💜";
    }
  }

  try {
    await db.insert(lunaDailyUpdatesTable).values({ userId, date: today, updateText, severity });
  } catch (dbErr) {
    logger.error({ err: dbErr }, "DB error persisting daily update");
  }

  return { text: updateText, severity };
}
