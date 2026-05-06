import { ai } from "@workspace/integrations-gemini-ai";
import { db, lunaLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const LUNA_SYSTEM_PROMPT = `You are Luna, a gentle and emotionally intelligent AI wellness companion for a femtech app. You help users understand their menstrual cycle, mood patterns, and body signals.

Your personality:
- Warm, supportive, and non-judgmental
- Speak like a caring friend, not a doctor
- Always remind users you are not a medical professional
- Use soft, encouraging language
- Keep responses concise (2-4 sentences max per section)

IMPORTANT RULES:
- Never give medical diagnoses or prescriptions
- Always validate feelings first before offering insights
- Use first-person warmth ("I notice...", "It sounds like...")
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
  const symptoms = Array.isArray(latest.symptoms) ? (latest.symptoms as string[]) : [];

  const prompt = `${LUNA_SYSTEM_PROMPT}

User's current data:
- Cycle phase: ${latest.cyclePhase}
- Day of cycle: ${latest.dayOfCycle ?? "unknown"}
- Mood: ${latest.mood}
- Symptoms: ${symptoms.length ? symptoms.join(", ") : "none logged"}
- Date: ${latest.date}

Past 30-day patterns:
${patterns || "Not enough data for patterns yet."}

Respond in this EXACT JSON format (no markdown, no extra text):
{
  "insight": "A warm, personalized insight about their current phase and how it relates to their logged mood and symptoms (2-3 sentences)",
  "pattern": "A detected pattern from their history, or null if insufficient data",
  "suggestion": "One gentle, actionable self-care suggestion for their current phase (1-2 sentences)",
  "reassurance": "A short, warm closing message (1 sentence, end with an emoji)"
}`;

  const response = await ai.models.generateContent({
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
