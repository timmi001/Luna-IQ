import { motion, AnimatePresence } from "framer-motion";

interface LiveCycleRingProps {
  phase: string;
  currentDay: number;
  cycleLength: number;
  daysUntilNextPeriod: number | null;
  onClick?: () => void;
}

const PHASE_THEMES: Record<string, {
  segments: string[];
  active: string;
  glow: string;
  bg: [string, string];
  label: string;
  dot: string;
}> = {
  Menstrual: {
    segments: ["#FF4D6D", "#FF758C", "#C9184A", "#FF4D6D"],
    active: "#FF4D6D",
    glow: "rgba(255,77,109,0.55)",
    bg: ["#FFF0F3", "#FFE4EA"],
    label: "Menstrual Phase",
    dot: "#C9184A",
  },
  Follicular: {
    segments: ["#06D6A0", "#40C9A2", "#0CB89A", "#06D6A0"],
    active: "#06D6A0",
    glow: "rgba(6,214,160,0.55)",
    bg: ["#F0FFF8", "#D8FFF0"],
    label: "Follicular Phase",
    dot: "#059669",
  },
  Ovulation: {
    segments: ["#FFB703", "#FB8500", "#FFD166", "#FFB703"],
    active: "#FFB703",
    glow: "rgba(255,183,3,0.55)",
    bg: ["#FFFBF0", "#FFF3CD"],
    label: "Ovulation Phase",
    dot: "#F59E0B",
  },
  Luteal: {
    segments: ["#7B2FBE", "#9D4EDD", "#C77DFF", "#7B2FBE"],
    active: "#9D4EDD",
    glow: "rgba(157,78,221,0.55)",
    bg: ["#FAF5FF", "#EDE9FE"],
    label: "Luteal Phase",
    dot: "#7C3AED",
  },
  Unknown: {
    segments: ["#C084FC", "#E879F9", "#818CF8", "#C084FC"],
    active: "#C084FC",
    glow: "rgba(192,132,252,0.4)",
    bg: ["#FDF4FF", "#EDE9FE"],
    label: "Track your cycle",
    dot: "#A78BFA",
  },
};

const PHASES = [
  { name: "Menstrual",  days: 5  },
  { name: "Follicular", days: 8  },
  { name: "Ovulation",  days: 3  },
  { name: "Luteal",     days: 12 },
];
const TOTAL_DAYS = 28;
const GAP = 5;
const CX = 155, CY = 155, R = 115, SW = 22;

function pol(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, s: number, e: number) {
  const a = pol(cx, cy, r, s);
  const b = pol(cx, cy, r, e);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${e - s > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function LiveCycleRing({ phase, currentDay, cycleLength, daysUntilNextPeriod, onClick }: LiveCycleRingProps) {
  const theme = PHASE_THEMES[phase] ?? PHASE_THEMES.Unknown!;

  // Build phase segments scaled to actual cycle length
  const scale = cycleLength / TOTAL_DAYS;
  let acc = 0;
  const segments = PHASES.map((p) => {
    const angle = (p.days * scale / cycleLength) * 360;
    const start = acc + GAP / 2;
    const end = acc + angle - GAP / 2;
    const mid = acc + angle / 2;
    acc += angle;
    return { ...p, start, end, mid };
  });

  // Current day dot position
  const dotAngle = cycleLength > 0 ? ((currentDay - 0.5) / cycleLength) * 360 : 0;
  const dotPos = pol(CX, CY, R, dotAngle);

  // Outer glow ring angle for active phase
  const activeSeg = segments.find(s => s.name === phase);

  return (
    <motion.button
      onClick={onClick}
      className="relative flex items-center justify-center focus:outline-none mx-auto"
      style={{ width: 310, height: 310, background: "transparent" }}
      whileTap={{ scale: 0.96 }}
    >
      {/* Outer radial glow background */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${theme.bg[0]} 0%, ${theme.bg[1]} 60%, transparent 100%)`,
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* SVG ring */}
      <svg width={310} height={310} viewBox="0 0 310 310" className="absolute inset-0" style={{ overflow: "visible" }}>
        <defs>
          {/* Gradient per phase */}
          {PHASES.map((p, i) => (
            <linearGradient key={p.name} id={`grad-${p.name}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={PHASE_THEMES[p.name]?.segments[0] ?? "#ccc"} />
              <stop offset="100%" stopColor={PHASE_THEMES[p.name]?.segments[2] ?? "#ccc"} />
            </linearGradient>
          ))}
          {/* Glow filter */}
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Soft glow for inactive */}
          <filter id="softglow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(200,200,220,0.18)" strokeWidth={SW + 4} />

        {/* Phase arcs */}
        {segments.map((seg) => {
          const isActive = seg.name === phase;
          return (
            <motion.path
              key={seg.name}
              d={arc(CX, CY, R, seg.start, seg.end)}
              fill="none"
              stroke={`url(#grad-${seg.name})`}
              strokeWidth={isActive ? SW + 4 : SW - 4}
              strokeLinecap="round"
              filter={isActive ? "url(#glow)" : "url(#softglow)"}
              opacity={isActive ? 1 : 0.28}
              animate={isActive ? {
                opacity: [1, 0.8, 1],
                strokeWidth: [SW + 4, SW + 7, SW + 4],
              } : {}}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          );
        })}

        {/* Phase label ticks */}
        {segments.map((seg) => {
          const tp = pol(CX, CY, R + 20, seg.mid);
          return (
            <text
              key={seg.name + "_lbl"}
              x={tp.x.toFixed(1)}
              y={tp.y.toFixed(1)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={8.5}
              fontWeight={seg.name === phase ? "800" : "500"}
              fill={seg.name === phase ? (PHASE_THEMES[seg.name]?.active ?? "#888") : "#B0B0C0"}
              fontFamily="Outfit, Inter, sans-serif"
              letterSpacing="0.02em"
            >
              {seg.name.slice(0, 3).toUpperCase()}
            </text>
          );
        })}

        {/* Current day dot */}
        {phase !== "Unknown" && (
          <>
            <motion.circle
              cx={dotPos.x.toFixed(2)}
              cy={dotPos.y.toFixed(2)}
              r={10}
              fill={theme.glow}
              animate={{ r: [10, 13, 10], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <circle
              cx={dotPos.x.toFixed(2)}
              cy={dotPos.y.toFixed(2)}
              r={6}
              fill="white"
              stroke={theme.dot}
              strokeWidth={2.5}
              filter="url(#glow)"
            />
          </>
        )}
      </svg>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-1 text-center" style={{ pointerEvents: "none" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-1"
          >
            {/* Phase name */}
            <span className="text-[11px] font-bold tracking-widest uppercase" style={{ color: theme.active, letterSpacing: "0.12em" }}>
              {theme.label}
            </span>

            {/* Countdown */}
            {daysUntilNextPeriod !== null ? (
              <>
                <motion.span
                  key={daysUntilNextPeriod}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-black leading-none"
                  style={{ fontSize: 60, color: "#1a1a2e", lineHeight: 1, fontFamily: "Outfit, Inter, sans-serif" }}
                >
                  {daysUntilNextPeriod}
                </motion.span>
                <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
                  day{daysUntilNextPeriod !== 1 ? "s" : ""} until
                </span>
                <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
                  next period
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold" style={{ color: "#6B7280" }}>
                Log your<br />first period
              </span>
            )}

            {/* Day in cycle */}
            {phase !== "Unknown" && (
              <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                Day {currentDay} of {cycleLength}
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Log period pill */}
        <motion.div
          className="mt-2 rounded-full px-5 py-1.5 shadow-sm"
          style={{
            background: `linear-gradient(135deg, ${theme.bg[0]}, ${theme.bg[1]})`,
            border: `1.5px solid ${theme.active}40`,
          }}
          animate={{ boxShadow: [`0 0 0px ${theme.glow}`, `0 0 12px ${theme.glow}`, `0 0 0px ${theme.glow}`] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-[11px] font-bold" style={{ color: theme.active }}>Log period</span>
        </motion.div>
      </div>
    </motion.button>
  );
}
