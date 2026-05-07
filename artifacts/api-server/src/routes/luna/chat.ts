import { Router } from "express";
import { streamChatResponse } from "../../services/chat.js";
import { z } from "zod";

const router = Router();

const ChatBody = z.object({
  userId: z.string(),
  message: z.string(),
  conversationHistory: z
    .array(z.object({ role: z.string(), content: z.string() }))
    .optional(),
});

function isChatRateLimit(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
}

// ── POST /chat — streaming chat via dedicated chat service ─────────────────────
// This route is completely independent of the insight daily limit.
// It uses its own Gemini client and model — no caching, no daily restrictions.
router.post("/chat", async (req, res) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { userId, message, conversationHistory = [] } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    await streamChatResponse(userId, message, conversationHistory, (text) => {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const msg = isChatRateLimit(err)
      ? "I'm catching my breath for a moment, dear. Give me a few seconds and try again. 🌸"
      : "I had a little hiccup on my end. Please send your message again. 💜";
    res.write(`data: ${JSON.stringify({ content: msg })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

export default router;
