import { Router } from "express";
import { streamChatResponse } from "../../services/chat.js";
import { logger } from "../../lib/logger.js";
import { z } from "zod";

const router = Router();

// Hard limit: if Gemini takes longer than this the client gets a fallback message
const STREAM_TIMEOUT_MS = 30_000;
// Keepalive ping interval — prevents reverse-proxy from cutting idle SSE connections
const KEEPALIVE_INTERVAL_MS = 5_000;

const ChatBody = z.object({
  userId: z.string(),
  message: z.string(),
  conversationHistory: z
    .array(z.object({ role: z.string(), content: z.string() }))
    .optional(),
  cyclePhase: z.string().optional(),
  dayOfCycle: z.number().optional(),
});

// ── POST /chat — streaming chat via Server-Sent Events ────────────────────────
router.post("/chat", async (req, res) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { userId, message, conversationHistory = [], cyclePhase, dayOfCycle } = parsed.data;

  // Flush headers immediately so the client / proxy knows we're alive
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  let finished = false;

  const safeWrite = (payload: object) => {
    if (finished) return;
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      finished = true;
    }
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    try {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch { /* ignore */ }
  };

  // SSE keepalive: send a comment every 5 s to prevent proxy/idle timeouts
  const keepaliveId = setInterval(() => {
    if (finished) { clearInterval(keepaliveId); return; }
    try { res.write(": keepalive\n\n"); } catch { finished = true; }
  }, KEEPALIVE_INTERVAL_MS);

  // AbortController lets the service bail out of the for-await loop early
  const controller = new AbortController();

  // Hard timeout — fire fallback message and close the SSE stream
  const timeoutId = setTimeout(() => {
    clearInterval(keepaliveId);
    if (!finished) {
      logger.warn({ userId }, "Chat SSE timeout — closing gracefully");
      controller.abort();
      safeWrite({ content: "I need a moment, dear. Please try sending your message again. 💜" });
      finish();
    }
  }, STREAM_TIMEOUT_MS);

  // Handle client disconnect (res.close fires when the client drops the SSE connection)
  res.on("close", () => {
    clearTimeout(timeoutId);
    clearInterval(keepaliveId);
    controller.abort();
    finished = true;
  });

  try {
    await streamChatResponse(
      userId,
      message,
      conversationHistory,
      (text) => safeWrite({ content: text }),
      controller.signal,
      cyclePhase !== undefined ? { cyclePhase, dayOfCycle } : undefined,
    );
  } catch (err) {
    logger.error({ err, userId }, "Unexpected chat route error");
    if (!finished) {
      safeWrite({ content: "I had a little hiccup. Please send your message again. 💜" });
    }
  } finally {
    clearTimeout(timeoutId);
    clearInterval(keepaliveId);
    finish();
  }
});

export default router;
