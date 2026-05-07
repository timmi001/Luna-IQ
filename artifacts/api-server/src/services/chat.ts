import { GoogleGenAI } from "@google/genai";
import { db, lunaLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { LUNA_SYSTEM_PROMPT } from "./luna.js";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is not set");

const chatGenai = new GoogleGenAI({ apiKey });

const CHAT_MODEL = "gemini-2.0-flash";

export type ChatMessage = { role: string; content: string };

export async function getRecentLogsContext(userId: string): Promise<string> {
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
}

export async function streamChatResponse(
  userId: string,
  message: string,
  conversationHistory: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const recentContext = await getRecentLogsContext(userId);

  const systemContext = `${LUNA_SYSTEM_PROMPT}

User's recent wellness data:
${recentContext}`;

  const chatMessages = [
    { role: "user" as const, parts: [{ text: systemContext }] },
    {
      role: "model" as const,
      parts: [{ text: "Understood. I'm Luna, ready to support you with warmth and care. 🌸" }],
    },
    ...conversationHistory.map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: message }] },
  ];

  const stream = await chatGenai.models.generateContentStream({
    model: CHAT_MODEL,
    contents: chatMessages,
    config: { maxOutputTokens: 8192 },
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) onChunk(text);
  }
}
