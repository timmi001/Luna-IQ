import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "idle" | "inhale" | "hold1" | "exhale" | "hold2";

const PHASE_CONFIG: Record<Phase, { label: string; duration: number; next: Phase; scale: number; color: string }> = {
  idle: { label: "Tap to breathe", duration: 0, next: "inhale", scale: 1, color: "#C4B5FD" },
  inhale: { label: "Inhale…", duration: 4000, next: "hold1", scale: 1.55, color: "#A78BFA" },
  hold1: { label: "Hold…", duration: 4000, next: "exhale", scale: 1.55, color: "#DDD6FE" },
  exhale: { label: "Exhale…", duration: 4000, next: "hold2", scale: 1, color: "#C4B5FD" },
  hold2: { label: "Hold…", duration: 4000, next: "inhale", scale: 1, color: "#EDE9FE" },
};

export function BreatheCard() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [cycles, setCycles] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = phase !== "idle";

  useEffect(() => {
    if (!isActive) return;
    const config = PHASE_CONFIG[phase];
    timerRef.current = setTimeout(() => {
      if (phase === "hold2") setCycles((c) => c + 1);
      setPhase(config.next);
    }, config.duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, isActive]);

  const handleToggle = () => {
    if (isActive) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("idle");
      setCycles(0);
    } else {
      setPhase("inhale");
    }
  };

  const config = PHASE_CONFIG[phase];

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-card-border flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Breathe</p>
        <span className="text-[10px] text-purple-400 font-medium">4 · 4 · 4</span>
      </div>

      {/* Animated circle */}
      <button onClick={handleToggle} className="relative flex items-center justify-center focus:outline-none" style={{ width: 80, height: 80 }}>
        {/* Outer glow ring */}
        <motion.div
          animate={{ scale: config.scale, opacity: isActive ? 0.4 : 0.2 }}
          transition={{ duration: config.duration / 1000, ease: "easeInOut" }}
          className="absolute rounded-full"
          style={{
            inset: 0,
            background: "radial-gradient(circle, #A78BFA 0%, transparent 70%)",
            filter: "blur(8px)",
          }}
        />
        {/* Main circle */}
        <motion.div
          animate={{ scale: config.scale }}
          transition={{ duration: config.duration / 1000, ease: "easeInOut" }}
          className="absolute rounded-full"
          style={{
            inset: 12,
            background: `radial-gradient(circle at 35% 35%, ${config.color}, #7C3AED)`,
            boxShadow: isActive ? `0 0 20px rgba(167,139,250,0.6)` : "none",
          }}
        />
        {/* Center emoji */}
        <span className="relative z-10 text-lg select-none">🌙</span>
      </button>

      {/* Phase label */}
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="text-xs font-medium text-purple-500 text-center"
        >
          {config.label}
        </motion.p>
      </AnimatePresence>

      {cycles > 0 && (
        <p className="text-[10px] text-muted-foreground">{cycles} cycle{cycles !== 1 ? "s" : ""} completed ✨</p>
      )}
    </div>
  );
}
