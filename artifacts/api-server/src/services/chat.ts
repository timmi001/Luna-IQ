import { getGenAI, isRateLimit } from "../lib/gemini.js";
import { logger } from "../lib/logger.js";
import { db, lunaLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { LUNA_SYSTEM_PROMPT } from "./luna.js";

const CHAT_MODEL = "gemini-2.5-flash";

export type ChatMessage = { role: string; content: string };

export type LiveCycleContext = {
  cyclePhase?: string;
  dayOfCycle?: number;
};

export async function getRecentLogsContext(userId: string): Promise<string> {
  try {
    const logs = await db
      .select()
      .from(lunaLogsTable)
      .where(eq(lunaLogsTable.userId, userId))
      .orderBy(desc(lunaLogsTable.date))
      .limit(7);

    if (logs.length === 0) return "No logs recorded yet.";

    return logs
      .map((l) => {
        const syms = Array.isArray(l.symptoms)
          ? (l.symptoms as string[]).join(", ")
          : "none";
        return `[${l.date}] Phase: ${l.cyclePhase}, Mood: ${l.mood}, Symptoms: ${syms}`;
      })
      .join("\n");
  } catch (err) {
    logger.warn({ err }, "DB error fetching chat context — proceeding without history");
    return "No logs available right now.";
  }
}

export async function streamChatResponse(
  userId: string,
  message: string,
  conversationHistory: ChatMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  liveContext?: LiveCycleContext,
): Promise<void> {
  const recentContext = await getRecentLogsContext(userId);

  // Live cycle status is calculated fresh on the client from today's date + cycle start.
  // It always reflects the user's CURRENT phase, regardless of what was stored in past logs.
  const liveStatus = liveContext?.cyclePhase
    ? `User's CURRENT cycle status (calculated right now — use this, not the phase in past logs):
- Phase: ${liveContext.cyclePhase}
- Day of cycle: ${liveContext.dayOfCycle ?? "unknown"}

`
    : "";

  const systemContext = `${LUNA_SYSTEM_PROMPT}

${liveStatus}User's recent wellness log history (for mood and symptom patterns — phases listed here may be outdated):
${recentContext}`;

  const chatMessages = [
    { role: "user"  as const, parts: [{ text: systemContext }] },
    { role: "model" as const, parts: [{ text: "Understood. I'm Luna, ready to support you with warmth and care. 🌸" }] },
    ...conversationHistory.map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: message }] },
  ];

  try {
    const stream = await getGenAI().models.generateContentStream({
      model: CHAT_MODEL,
      contents: chatMessages,
      config: { maxOutputTokens: 8192 },
    });

    for await (const chunk of stream) {
      // Stop iteration early if caller has timed out / disconnected
      if (signal?.aborted) break;
      const text = chunk.text;
      if (text) onChunk(text);
    }
  } catch (err) {
    if (signal?.aborted) {
      // Timeout was already handled by the caller — don't double-write
      logger.warn({ userId }, "Chat stream stopped: caller aborted");
      return;
    }
    logger.error({ err, userId, model: CHAT_MODEL }, "Gemini chat stream error");
    const msg = isRateLimit(err)
      ? "I'm catching my breath for a moment, dear. Give me a few seconds and try again. 🌸"
      : "I had a little hiccup on my end. Please send your message again. 💜";
    onChunk(msg);
  }
}
