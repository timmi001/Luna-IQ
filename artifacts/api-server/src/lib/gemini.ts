import { GoogleGenAI } from "@google/genai";
import { logger } from "./logger.js";

// Lazy singleton — never throws at module load time
let _instance: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (_instance) return _instance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  _instance = new GoogleGenAI({ apiKey });
  return _instance;
}

// Backwards-compatible proxy export so existing imports still work
export const genai = new Proxy({} as GoogleGenAI, {
  get(_target, prop) {
    return getGenAI()[prop as keyof GoogleGenAI];
  },
});

// ── Timeout wrapper for non-streaming calls ───────────────────────────────────
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Gemini timeout: ${label} exceeded ${ms}ms`));
    }, ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err as Error); },
    );
  });
}

// ── Classify error types ──────────────────────────────────────────────────────
export function isRateLimit(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err);
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");
}

export function isTransient(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err);
  return (
    isRateLimit(err) ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("timeout") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT")
  );
}

// ── Single-retry wrapper ──────────────────────────────────────────────────────
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  retryDelayMs = 1500,
): Promise<T> {
  try {
    return await fn();
  } catch (firstErr) {
    if (isTransient(firstErr)) {
      logger.warn({ err: firstErr, label }, "Gemini transient error — retrying once");
      await new Promise((r) => setTimeout(r, retryDelayMs));
      return await fn(); // let second failure propagate naturally
    }
    throw firstErr;
  }
}
