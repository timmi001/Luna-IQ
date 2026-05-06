import { genai } from "../lib/gemini.js";
import { db, lunaLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const LUNA_SYSTEM_PROMPT = `You are Luna, a gentle and emotionally intelligent wellness companion designed for women in Nigeria and Africa. You help users understand their menstrual cycle, mood patterns, and body signals.

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

function detectPatterns(logs: Array<{ mood: string; cyclePhase: string; symptoms: unknown }>): string {
  if (logs.length < 3) return "";
  const moodCounts: Record<string, number> = {};
  const symptomCounts: Record<string, number> = {};
  const phaseSymptoms: Record<string, string[]> = {};

  for (const log of logs) {
    moodCounts[log.mood] = (moodCounts[log.mood] ?? 0) + 1;
    const syms = Array.isArray(log.symptoms) ? (log.symptoms as string[]) : [];
    for (const s of syms) {
      symptomCounts[s] = (symptomCounts[s] ?? 0) + 1;
    }
    if (!phaseSymptoms[log.cyclePhase]) phaseSymptoms[log.cyclePhase] = [];
    phaseSymptoms[log.cyclePhase].push(...syms);
  }

  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const repeatedSymptoms = Object.entries(symptomCounts)
    .filter(([, c]) => c >= 2)
    .map(([s]) => s);

  const parts: string[] = [];
  if (dominantMood) parts.push(`Dominant mood: ${dominantMood[0]} (${dominantMood[1]} times)`);
  if (repeatedSymptoms.length) parts.push(`Recurring symptoms: ${repeatedSymptoms.join(", ")}`);
  const phaseEntries = Object.entries(phaseSymptoms).filter(([, s]) => s.length > 0);
  if (phaseEntries.length) {
    parts.push(`Phase-specific patterns: ${phaseEntries.map(([p, s]) => `${p}: ${[...new Set(s)].join(", ")}`).join(" | ")}`);
  }
  return parts.join(". ");
}

export async function generateInsight(userId: string): Promise<{
  insight: string;
  pattern: string | null;
  suggestion: string;
  reassurance: string;
}> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logs = await db
    .select()
    .from(lunaLogsTable)
    .where(eq(lunaLogsTable.userId, userId))
    .orderBy(desc(lunaLogsTable.date))
    .limit(30);

  if (logs.length === 0) {
    return {
      insight: "Start logging your cycle and mood to receive personalized insights.",
      pattern: null,
      suggestion: "Try logging your mood and symptoms daily for at least a week.",
      reassurance: "Every small step toward self-awareness is meaningful. You've got this! 🌸",
    };
  }

  const latest = logs[0]!;
  const patterns = detectPatterns(logs);
  const latestSymptoms = Array.isArray(latest.symptoms) ? (latest.symptoms as string[]) : [];

  // Build a readable recent-history summary (last 7 entries)
  const recentSummary = logs.slice(0, 7).map((l) => {
    const syms = Array.isArray(l.symptoms) ? (l.symptoms as string[]).join(", ") : "none";
    return `• ${l.date} — Phase: ${l.cyclePhase} (Day ${l.dayOfCycle ?? "?"}) | Mood: ${l.mood} | Symptoms: ${syms || "none"}`;
  }).join("\n");

  const prompt = `${LUNA_SYSTEM_PROMPT}

The user has been logging their health data. Use ALL of the information below to write a personalized, specific insight — not a generic one.

TODAY'S DATA:
- Cycle phase: ${latest.cyclePhase}
- Day of cycle: ${latest.dayOfCycle ?? "unknown"}
- Mood: ${latest.mood}
- Symptoms logged: ${latestSymptoms.length ? latestSymptoms.join(", ") : "none"}
- Date: ${latest.date}

RECENT LOG HISTORY (last 7 entries):
${recentSummary}

DETECTED PATTERNS:
${patterns || "Not enough data for patterns yet — base insight on today's data."}

INSTRUCTIONS:
- Reference specific things from their logs (mention their actual mood, actual symptoms, actual cycle phase)
- If they have symptoms like cramps, bloating, flow intensity — acknowledge it by name
- If their mood has been low or anxious multiple times — acknowledge that gently
- Keep suggestions simple and realistic for a busy woman's daily life

Respond in this EXACT JSON format (no markdown, no extra text):
{
  "insight": "A warm, specific insight that directly references their logged mood and symptoms today (2-3 sentences)",
  "pattern": "A specific pattern noticed from their log history (e.g. 'You tend to feel tired in your luteal phase'), or null if fewer than 3 logs",
  "suggestion": "One practical, simple self-care suggestion based on their current phase and symptoms (1-2 sentences)",
  "reassurance": "A short, warm closing message in a relatable African tone (1 sentence, end with an emoji)"
}`;

  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 8192, responseMimeType: "application/json" },
  });

  try {
    const text = response.text ?? "{}";
    const parsed = JSON.parse(text) as {
      insight?: string;
      pattern?: string | null;
      suggestion?: string;
      reassurance?: string;
    };
    return {
      insight: parsed.insight ?? "I see you've been tracking your wellness journey.",
      pattern: parsed.pattern ?? null,
      suggestion: parsed.suggestion ?? "Take a moment to rest and listen to your body.",
      reassurance: parsed.reassurance ?? "You're doing great. 🌸",
    };
  } catch {
    return {
      insight: "I see you've been tracking your wellness journey.",
      pattern: patterns || null,
      suggestion: "Take a moment to rest and listen to your body.",
      reassurance: "You're doing great. 🌸",
    };
  }
}

export async function getRecentLogsContext(userId: string): Promise<string> {
  const logs = await db
    .select()
    .from(lunaLogsTable)
    .where(eq(lunaLogsTable.userId, userId))
    .orderBy(desc(lunaLogsTable.date))
    .limit(7);

  if (logs.length === 0) return "No logs yet.";

  return logs.map((l) => {
    const syms = Array.isArray(l.symptoms) ? (l.symptoms as string[]).join(", ") : "none";
    return `[${l.date}] Phase: ${l.cyclePhase}, Mood: ${l.mood}, Symptoms: ${syms}`;
  }).join("\n");
}

export { LUNA_SYSTEM_PROMPT };
