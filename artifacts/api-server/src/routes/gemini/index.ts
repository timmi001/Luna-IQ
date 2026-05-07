import { Router } from "express";
import { db, conversations as conversationsTable, messages as messagesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { getGenAI, withTimeout, isRateLimit } from "../../lib/gemini.js";
import { logger } from "../../lib/logger.js";
import { z } from "zod";

const router = Router();

const CreateConvBody = z.object({ title: z.string() });
const SendMsgBody    = z.object({ content: z.string() });

router.get("/conversations", async (_req, res) => {
  try {
    const convs = await db.select().from(conversationsTable).orderBy(conversationsTable.createdAt);
    res.json(convs);
  } catch (err) {
    logger.error({ err }, "DB error listing conversations");
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  const parsed = CreateConvBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "title required" }); return; }
  try {
    const [conv] = await db.insert(conversationsTable).values({ title: parsed.data.title }).returning();
    res.status(201).json(conv);
  } catch (err) {
    logger.error({ err }, "DB error creating conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conv) { res.status(404).json({ error: "Not found" }); return; }
    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(asc(messagesTable.createdAt));
    res.json({ ...conv, messages });
  } catch (err) {
    logger.error({ err, id }, "DB error fetching conversation");
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conv) { res.status(404).json({ error: "Not found" }); return; }
    await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
    await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
    res.status(204).end();
  } catch (err) {
    logger.error({ err, id }, "DB error deleting conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const msgs = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(asc(messagesTable.createdAt));
    res.json(msgs);
  } catch (err) {
    logger.error({ err, id }, "DB error fetching messages");
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = SendMsgBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "content required" }); return; }

  let conv: typeof conversationsTable.$inferSelect | undefined;
  try {
    [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, id));
    if (!conv) { res.status(404).json({ error: "Not found" }); return; }
    await db.insert(messagesTable).values({ conversationId: id, role: "user", content: parsed.data.content });
  } catch (err) {
    logger.error({ err, id }, "DB error saving user message");
    res.status(500).json({ error: "Failed to save message" });
    return;
  }

  let history: typeof messagesTable.$inferSelect[] = [];
  try {
    history = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(asc(messagesTable.createdAt));
  } catch (err) {
    logger.error({ err, id }, "DB error fetching history");
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    try { res.write(`data: ${JSON.stringify({ done: true })}\n\n`); res.end(); } catch { /* ignore */ }
  };

  const routeTimer = setTimeout(() => {
    if (!finished) {
      try { res.write(`data: ${JSON.stringify({ content: " (timed out)" })}\n\n`); } catch { /* ignore */ }
      finish();
    }
  }, 35_000);

  req.on("close", () => { clearTimeout(routeTimer); finished = true; });

  let fullResponse = "";

  try {
    const stream = await withTimeout(
      getGenAI().models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: history.map((m) => ({
          role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
          parts: [{ text: m.content }],
        })),
        config: { maxOutputTokens: 8192 },
      }),
      30_000,
      "gemini/stream",
    );

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text && !finished) {
        fullResponse += text;
        try { res.write(`data: ${JSON.stringify({ content: text })}\n\n`); } catch { break; }
      }
    }
  } catch (err) {
    logger.error({ err, id }, "Gemini stream error in gemini route");
    if (!finished) {
      const msg = isRateLimit(err)
        ? "I'm a bit busy right now. Please try again in a moment."
        : "Something went wrong on my end. Please try again.";
      try { res.write(`data: ${JSON.stringify({ content: msg })}\n\n`); } catch { /* ignore */ }
      fullResponse = fullResponse || msg;
    }
  } finally {
    clearTimeout(routeTimer);
  }

  if (fullResponse) {
    try {
      await db.insert(messagesTable).values({ conversationId: id, role: "assistant", content: fullResponse });
    } catch (err) {
      logger.error({ err, id }, "DB error saving assistant message");
    }
  }

  finish();
});

export default router;
