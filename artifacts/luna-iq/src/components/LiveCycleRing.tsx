import { motion, AnimatePresence } from "framer-motion";

interface LiveCycleRingProps {
  phase: string;
  currentDay: number;
  cycleLength: number;
  daysUntilNextPeriod: number | null;
  onClick?: () => void;
}

const PHASE_THEMES: Record<string, {
  primary: string;
  secondary: string;
  glow: string;
  bg: string;
  textColor: string;
}> = {
  Menstrual: {
    primary:   "#FF4D6D",
    secondary: "#FF8FA3",
    glow:      "rgba(255,77,109,0.45)",
    bg:        "radial-gradient(circle, #FFF0F3 0%, #FFD6DF 70%, #FFAFC0 100%)",
    textColor: "#C9184A",
  },
  Follicular: {
    primary:   "#06D6A0",
    secondary: "#40E8BF",
    glow:      "rgba(6,214,160,0.45)",
    bg:        "radial-gradient(circle, #F0FFFA 0%, #C7F7E9 70%, #9BEFD8 100%)",
    textColor: "#059669",
  },
  Ovulation: {
    primary:   "#FFB703",
    secondary: "#FFD60A",
    glow:      "rgba(255,183,3,0.45)",
    bg:        "radial-gradient(circle, #FFFBF0 0%, #FFEDB3 70%, #FFD970 100%)",
    textColor: "#B45309",
  },
  Luteal: {
    primary:   "#9D4EDD",
    secondary: "#C77DFF",
    glow:      "rgba(157,78,221,0.45)",
    bg:        "radial-gradient(circle, #FAF5FF 0%, #E9D5FF 70%, #C4B5FD 100%)",
    textColor: "#6D28D9",
  },
  Unknown: {
    primary:   "#A78BFA",
    secondary: "#DDD6FE",
    glow:      "rgba(167,139,250,0.35)",
    bg:        "radial-gradient(circle, #FAF5FF 0%, #EDE9FE 70%, #DDD6FE 100%)",
    textColor: "#7C3AED",
  },
};

const CX = 155, CY = 155, R = 110, SW = 20;

function pol(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = pol(cx, cy, r, startDeg);
  const e = pol(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

export function LiveCycleRing({ phase, currentDay, cycleLength, daysUntilNextPeriod, onClick }: LiveCycleRingProps) {
  const t = PHASE_THEMES[phase] ?? PHASE_THEMES.Unknown!;

  const progressDeg = cycleLength > 0 ? Math.min(359.9, (currentDay / cycleLength) * 360) : 0;
  const dotAngle = cycleLength > 0 ? ((currentDay - 0.5) / cycleLength) * 360 : 0;
  const dotPos = pol(CX, CY, R, dotAngle);

  return (
    <motion.button
      onClick={onClick}
      className="relative flex items-center justify-center focus:outline-none mx-auto"
      style={{ width: 310, height: 310 }}
      whileTap={{ scale: 0.96 }}
    >
      {/* Animated phase background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          className="absolute inset-0 rounded-full"
          style={{ background: t.bg }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
      </AnimatePresence>

      {/* Outer glow pulse */}
      <motion.div
        key={phase + "_glow"}
        className="absolute rounded-full"
        style={{ inset: -8, background: t.glow, filter: "blur(18px)" }}
        animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* SVG ring */}
      <svg width={310} height={310} viewBox="0 0 310 310" className="absolute inset-0" style={{ overflow: "visible" }}>
        <defs>
          <filter id="ringglow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="dotglow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track — full ring, phase color at low opacity */}
        <motion.circle
          cx={CX} cy={CY} r={R}
          fill="none"
          strokeWidth={SW}
          strokeLinecap="round"
          animate={{ stroke: t.secondary }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          opacity={0.22}
        />

        {/* Progress arc — full phase color */}
        {progressDeg > 0 && (
          <motion.path
            d={arc(CX, CY, R, 0, progressDeg)}
            fill="none"
            strokeWidth={SW}
            strokeLinecap="round"
            filter="url(#ringglow)"
            animate={{ stroke: t.primary }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        )}

        {/* Day dot — glowing tip */}
        {phase !== "Unknown" && (
          <>
            <motion.circle
              cx={dotPos.x.toFixed(2)} cy={dotPos.y.toFixed(2)} r={14}
              animate={{ fill: t.glow, r: [14, 18, 14] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              filter="url(#dotglow)"
            />
            <motion.circle
              cx={dotPos.x.toFixed(2)} cy={dotPos.y.toFixed(2)} r={7}
              fill="white"
              strokeWidth={3}
              animate={{ stroke: t.primary }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </>
        )}
      </svg>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-0.5 text-center" style={{ pointerEvents: "none" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-0.5"
          >
            {/* Phase name */}
            <motion.span
              className="text-[10px] font-extrabold tracking-widest uppercase mb-1"
              animate={{ color: t.textColor }}
              transition={{ duration: 0.7 }}
              style={{ letterSpacing: "0.14em" }}
            >
              {phase !== "Unknown" ? phase : "Track your cycle"}
            </motion.span>

            {/* Countdown */}
            {daysUntilNextPeriod !== null ? (
              <>
                <motion.span
                  key={daysUntilNextPeriod}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="font-black leading-none"
                  style={{ fontSize: 64, lineHeight: 1, fontFamily: "Outfit, Inter, sans-serif", color: "#1a1a2e" }}
                >
                  {daysUntilNextPeriod}
                </motion.span>
                <span className="text-xs font-medium text-gray-500 leading-snug">
                  {daysUntilNextPeriod === 1 ? "day" : "days"} until<br />next period
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-gray-500">
                Log your<br />first period
              </span>
            )}

            {phase !== "Unknown" && (
              <span className="text-[9px] text-gray-400 mt-0.5">Day {currentDay} of {cycleLength}</span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Log period pill */}
        <motion.div
          className="mt-3 rounded-full px-5 py-1.5 shadow"
          animate={{
            backgroundColor: t.primary,
            boxShadow: [`0 0 0px ${t.glow}`, `0 4px 18px ${t.glow}`, `0 0 0px ${t.glow}`],
          }}
          transition={{ duration: 0.7, boxShadow: { duration: 2.4, repeat: Infinity } }}
        >
          <span className="text-[11px] font-bold text-white">Log period</span>
        </motion.div>
      </div>
    </motion.button>
  );
}
