import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";

type Phase = "inhale" | "hold" | "exhale" | "idle";

const PHASES: { phase: Phase; label: string; seconds: number; color: string }[] = [
  { phase: "inhale", label: "Inhale", seconds: 4, color: "#f9a8d4" },
  { phase: "hold", label: "Hold", seconds: 4, color: "#c4b5fd" },
  { phase: "exhale", label: "Exhale", seconds: 4, color: "#6ee7b7" },
];

export default function Breathe() {
  const [, setLocation] = useLocation();
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(4);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef(4);
  const phaseRef = useRef(0);

  const currentPhase = running ? PHASES[phaseIdx] : null;

  const stop = () => {
    setRunning(false);
    setPhaseIdx(0);
    setCountdown(4);
    countRef.current = 4;
    phaseRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const start = () => {
    setCycles(0);
    phaseRef.current = 0;
    countRef.current = 4;
    setPhaseIdx(0);
    setCountdown(4);
    setRunning(true);
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      countRef.current -= 1;
      setCountdown(countRef.current);
      if (countRef.current <= 0) {
        const nextPhase = (phaseRef.current + 1) % 3;
        if (nextPhase === 0) setCycles((c) => c + 1);
        phaseRef.current = nextPhase;
        countRef.current = 4;
        setPhaseIdx(nextPhase);
        setCountdown(4);
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const ringScale = currentPhase?.phase === "inhale" ? 1.35 : currentPhase?.phase === "exhale" ? 0.75 : 1.05;
  const ringColor = currentPhase?.color ?? "#e9d5ff";

  return (
    <PageTransition className="flex flex-col min-h-screen bg-gradient-to-b from-[#f9f5ff] to-[#fdf4ff]">
      <header className="px-6 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Box Breathing</h1>
          <p className="text-xs text-muted-foreground">4 · 4 · 4 calm reset</p>
        </div>
        {cycles > 0 && (
          <span className="ml-auto text-xs font-medium text-purple-400 bg-purple-50 rounded-full px-3 py-1">{cycles} round{cycles !== 1 ? "s" : ""}</span>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center pb-20 px-6">
        {/* Breathing ring */}
        <div className="relative flex items-center justify-center mb-12">
          {/* Outer glow */}
          <motion.div
            animate={{ scale: running ? ringScale : 1, opacity: running ? 0.25 : 0.12 }}
            transition={{ duration: 4, ease: "easeInOut" }}
            className="absolute w-64 h-64 rounded-full"
            style={{ background: ringColor, filter: "blur(32px)" }}
          />
          {/* Middle ring */}
          <motion.div
            animate={{ scale: running ? ringScale * 0.9 : 1, opacity: running ? 0.5 : 0.2 }}
            transition={{ duration: 4, ease: "easeInOut" }}
            className="absolute w-48 h-48 rounded-full border-2"
            style={{ borderColor: ringColor }}
          />
          {/* Core circle */}
          <motion.div
            animate={{ scale: running ? ringScale * 0.8 : 1 }}
            transition={{ duration: 4, ease: "easeInOut" }}
            className="w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-xl z-10"
            style={{ background: `radial-gradient(circle at 40% 40%, ${ringColor}, #ffffff)` }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhase?.phase ?? "idle"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center"
              >
                {running ? (
                  <>
                    <span className="text-3xl font-bold text-foreground">{countdown}</span>
                    <span className="text-xs font-medium text-foreground/60 mt-0.5">{currentPhase?.label}</span>
                  </>
                ) : (
                  <span className="text-4xl">🌸</span>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Phase progress dots */}
        <div className="flex gap-4 mb-10">
          {PHASES.map((p, i) => (
            <div key={p.phase} className="flex flex-col items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full transition-all duration-500"
                style={{ background: running && phaseIdx === i ? p.color : "#e5e7eb", transform: running && phaseIdx === i ? "scale(1.4)" : "scale(1)" }}
              />
              <span className="text-[10px] text-muted-foreground">{p.label}</span>
            </div>
          ))}
        </div>

        {/* Instructions */}
        {!running && (
          <div className="text-center mb-8 max-w-[260px]">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Breathe in for <b>4s</b>, hold for <b>4s</b>, breathe out for <b>4s</b>. A powerful technique to calm your nervous system.
            </p>
          </div>
        )}

        {/* CTA */}
        {!running ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={start}
            className="px-10 py-3.5 rounded-2xl text-white font-semibold text-sm shadow-md"
            style={{ background: "linear-gradient(135deg, #c4b5fd, #f9a8d4)" }}
          >
            Begin
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={stop}
            className="px-10 py-3.5 rounded-2xl text-sm font-semibold border border-border/40 bg-white text-muted-foreground shadow-sm"
          >
            Stop
          </motion.button>
        )}
      </main>
    </PageTransition>
  );
}
