import { useState, useRef, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { SendHorizonal, Sparkles, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/utils/storage";
import { getCycleDetails } from "@/utils/cycle";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const SUGGESTIONS = [
  "How am I doing in my current cycle phase?",
  "I'm feeling tired today, is that normal?",
  "What should I eat during my luteal phase?",
  "I've been feeling anxious lately.",
];

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm Luna 🌙 — your gentle wellness companion. I'm here to help you understand your cycle, mood, and body. How are you feeling today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const history = messages.slice(1);

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const assistantIdx = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    // Calculate live cycle phase from today's date and cycle start — never use a stored/cached value
    const cycleData = storage.getCycle();
    const { phase: livePhase, currentDay: liveDayOfCycle } = getCycleDetails(
      cycleData.lastPeriodStart,
      cycleData.cycleLength,
    );

    try {
      const res = await fetch(`${BASE}/api/luna/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "guest",
          message: text.trim(),
          conversationHistory: history.map((m) => ({ role: m.role, content: m.content })),
          cyclePhase: livePhase !== "Unknown" ? livePhase : undefined,
          dayOfCycle: livePhase !== "Unknown" ? liveDayOfCycle : undefined,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Network error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { content?: string; done?: boolean };
            if (data.done) break;
            if (data.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: last.content + data.content };
                }
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && last.streaming) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: "I'm having a little trouble right now. Please try again in a moment. 🌸",
          };
        }
        return updated;
      });
    } finally {
      setMessages((prev) =>
        prev.map((m, i) => (i === prev.length - 1 ? { ...m, streaming: false } : m))
      );
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setMessages([{
      role: "assistant",
      content: "Hi! I'm Luna 🌙 — your gentle wellness companion. I'm here to help you understand your cycle, mood, and body. How are you feeling today?",
    }]);
    setInput("");
  };

  return (
    <PageTransition className="flex flex-col h-screen max-h-[100dvh] overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-12 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            Luna Chat <Sparkles className="w-4 h-4 text-luna-peach" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Your private wellness companion</p>
        </div>
        <button
          onClick={handleReset}
          className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center active:scale-95 transition-transform"
        >
          <RotateCcw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-luna-lavender/60 flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1">
                  🌙
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-purple-500 to-pink-400 text-white rounded-br-sm"
                    : "bg-white border border-card-border text-foreground rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.content}
                {msg.streaming && msg.content === "" && (
                  <span className="flex gap-1 py-1">
                    {[0, 1, 2].map((j) => (
                      <motion.span
                        key={j}
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
                        animate={{ scale: [1, 1.4, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: j * 0.2 }}
                      />
                    ))}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Suggestions (show only at start) */}
        {messages.length === 1 && (
          <div className="flex flex-col gap-2 mt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-left text-xs bg-white border border-card-border rounded-2xl px-3.5 py-2.5 text-muted-foreground hover:bg-luna-lavender/10 hover:text-foreground transition-colors active:scale-[0.98] shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-24 pt-2 flex-shrink-0 bg-background/80 backdrop-blur-md border-t border-border/20">
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 border border-card-border shadow-sm focus-within:border-purple-300 transition-colors">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Talk to Luna…"
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-60"
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
            style={{
              background: input.trim() && !isStreaming
                ? "linear-gradient(135deg,#c4b5fd,#f9a8d4)"
                : "#f3f4f6",
            }}
          >
            <SendHorizonal className="w-3.5 h-3.5 text-white" />
          </motion.button>
        </div>
      </div>
    </PageTransition>
  );
}
