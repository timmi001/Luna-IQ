import { Router } from "express";
import { db, lunaLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { genai } from "../../lib/gemini.js";
import { generateInsight, getRecentLogsContext, LUNA_SYSTEM_PROMPT } from "../../services/luna.js";
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

const ChatBody = z.object({
  userId: z.string(),
  message: z.string(),
  conversationHistory: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
});

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
  res.status(201).json(saved);
});

router.get("/logs/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const logs = await db
    .select()
    .from(lunaLogsTable)
    .where(eq(lunaLogsTable.userId, userId))
    .orderBy(desc(lunaLogsTable.date));
  res.json(logs);
});

router.post("/generate-insight", async (req, res) => {
  const parsed = InsightBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "userId required" }); return; }
  const result = await generateInsight(parsed.data.userId);
  res.json(result);
});

router.post("/chat", async (req, res) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }
  const { userId, message, conversationHistory = [] } = parsed.data;

  const recentContext = await getRecentLogsContext(userId);

  const systemContext = `${LUNA_SYSTEM_PROMPT}

User's recent wellness data:
${recentContext}`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const chatMessages = [
    { role: "user" as const, parts: [{ text: systemContext }] },
    { role: "model" as const, parts: [{ text: "Understood. I'm Luna, ready to support you with warmth and care. 🌸" }] },
    ...conversationHistory.map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: message }] },
  ];

  const stream = await genai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: chatMessages,
    config: { maxOutputTokens: 8192 },
  });

  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
