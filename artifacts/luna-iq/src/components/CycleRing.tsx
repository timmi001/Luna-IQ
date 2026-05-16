import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CyclePhase } from "@/utils/cycle";

interface CycleRingProps {
  phase: CyclePhase;
  currentDay: number;
  cycleLength: number;
  selectedMood?: string;
  onMoodSelect?: (emoji: string, label: string) => void;
  /** When provided, replaces the mood-picker flower with custom center content */
  centerContent?: React.ReactNode;
  /** When provided, the whole center area becomes a tap target */
  onCenterTap?: () => void;
}

const MOODS = [
  { emoji: "😔", label: "Low" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "🙂", label: "Okay" },
  { emoji: "😊", label: "Good" },
  { emoji: "😍", label: "Amazing" },
];

const RING_PHASES = [
  { name: "Menstrual", days: 5, color: "#FDA4C9", label: "Menstrual" },
  { name: "Follicular", days: 8, color: "#C4B5FD", label: "Follicular" },
  { name: "Ovulation", days: 3, color: "#FDBA74", label: "Ovulation" },
  { name: "Luteal", days: 12, color: "#F472B6", label: "Luteal" },
];

const TOTAL_DAYS = 28;
const CX = 160, CY = 160;
const RING_R = 105;
const RING_SW = 26;
const LABEL_R = 138;
const GAP = 3;

function pol2cart(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = pol2cart(cx, cy, r, startDeg);
  const e = pol2cart(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function textAnchor(deg: number): "start" | "middle" | "end" {
  const d = ((deg % 360) + 360) % 360;
  if (d > 30 && d < 150) return "start";
  if (d > 210 && d < 330) return "end";
  return "middle";
}

export function CycleRing({ phase, currentDay, cycleLength, selectedMood = "🌙", onMoodSelect, centerContent, onCenterTap }: CycleRingProps) {
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  let acc = 0;
  const segments = RING_PHASES.map((p) => {
    const totalAngle = (p.days / TOTAL_DAYS) * 360;
    const start = acc + GAP / 2;
    const end = acc + totalAngle - GAP / 2;
    const mid = acc + totalAngle / 2;
    acc += totalAngle;
    return { ...p, start, end, mid };
  });

  const dotAngle = cycleLength > 0 ? ((currentDay - 0.5) / cycleLength) * 360 : 0;
  const dotPos = pol2cart(CX, CY, RING_R, dotAngle);

  const phaseColors: Record<string, string> = {
    Menstrual: "#FDA4C9",
    Follicular: "#C4B5FD",
    Ovulation: "#FDBA74",
    Luteal: "#F472B6",
    Unknown: "#E5E7EB",
  };
  const phaseColor = phaseColors[phase] ?? "#E5E7EB";

  const handleFlowerTap = () => setShowMoodPicker((v) => !v);

  const handleMoodSelect = (emoji: string, label: string) => {
    onMoodSelect?.(emoji, label);
    setShowMoodPicker(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 260, height: 260 }}>
        <svg
          viewBox="0 0 320 320"
          width={260}
          height={260}
          style={{ overflow: "visible" }}
        >
          {/* Background track */}
          <circle
            cx={CX} cy={CY} r={RING_R}
            fill="none"
            stroke="white"
            strokeWidth={RING_SW}
          />

          {/* Phase segments */}
          {segments.map((seg) => (
            <path
              key={seg.name}
              d={arcPath(CX, CY, RING_R, seg.start, seg.end)}
              fill="none"
              stroke={seg.color}
              strokeWidth={RING_SW}
              strokeLinecap="butt"
              opacity={phase === seg.name || phase === "Unknown" ? 1 : 0.35}
            />
          ))}

          {/* Phase labels */}
          {segments.map((seg) => {
            const lp = pol2cart(CX, CY, LABEL_R, seg.mid);
            return (
              <text
                key={seg.name + "_label"}
                x={lp.x.toFixed(1)}
                y={lp.y.toFixed(1)}
                textAnchor={textAnchor(seg.mid)}
                dominantBaseline="middle"
                fontSize={9}
                fontWeight={phase === seg.name ? "700" : "500"}
                fill={phase === seg.name ? seg.color : "#9CA3AF"}
                fontFamily="Outfit, Inter, sans-serif"
              >
                {seg.label}
              </text>
            );
          })}

          {/* Current day dot */}
          {phase !== "Unknown" && (
            <circle
              cx={dotPos.x.toFixed(2)}
              cy={dotPos.y.toFixed(2)}
              r={7}
              fill="white"
              stroke={phaseColor}
              strokeWidth={3}
            />
          )}
        </svg>

        {/* Center overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          {centerContent ? (
            /* Custom center — used by Cycle page */
            <button
              onClick={onCenterTap}
              className="flex flex-col items-center gap-1 focus:outline-none"
            >
              {centerContent}
            </button>
          ) : (
            /* Default flower + mood picker — used by Home/other pages */
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-xs font-bold tracking-wide text-center px-2"
                style={{ color: phaseColor, fontSize: "11px", letterSpacing: "0.04em" }}
              >
                {phase !== "Unknown" ? phase + " Phase" : "Log your cycle"}
              </span>

              <button
                onClick={handleFlowerTap}
                className="flex items-center justify-center rounded-full focus:outline-none"
                style={{
                  width: 56,
                  height: 56,
                  background: "linear-gradient(135deg, #fdf4ff 0%, #ede9fe 100%)",
                  border: "2.5px solid #ddd6fe",
                  boxShadow: "0 2px 12px rgba(167,139,250,0.35)",
                  fontSize: 26,
                }}
                aria-label="Set your mood"
              >
                {selectedMood}
              </button>

              <span className="text-xs text-center" style={{ color: "#9CA3AF", fontSize: "10px" }}>
                {phase !== "Unknown" ? `Day ${currentDay} of ${cycleLength}` : "tap 🌙 to log mood"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mood picker (only in default mode) */}
      {!centerContent && (
        <AnimatePresence>
          {showMoodPicker && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3 justify-center mt-1"
            >
              {MOODS.map((m) => (
                <motion.button
                  key={m.emoji}
                  whileTap={{ scale: 0.85 }}
                  whileHover={{ scale: 1.2 }}
                  onClick={() => handleMoodSelect(m.emoji, m.label)}
                  className="flex flex-col items-center gap-1 p-2 rounded-2xl bg-white shadow-sm border border-purple-100"
                >
                  <span style={{ fontSize: 24 }}>{m.emoji}</span>
                  <span className="text-[9px] text-muted-foreground font-medium">{m.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
