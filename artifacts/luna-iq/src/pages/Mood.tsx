import { useState } from "react";
import { storage, MoodEntry } from "@/utils/storage";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const MOODS = [
  {
    emoji: "🌟",
    label: "Radiant",
    petalBase: "#FEF08A",
    petalMid: "#FDE047",
    petalTip: "#EAB308",
    petalHighlight: "#FEFCE8",
    centerInner: "#FFFBEB",
    centerOuter: "#F59E0B",
    textColor: "#92400E",
    bg: "#FEFCE8",
  },
  {
    emoji: "😄",
    label: "Happy",
    petalBase: "#FBCFE8",
    petalMid: "#F9A8D4",
    petalTip: "#EC4899",
    petalHighlight: "#FDF2F8",
    centerInner: "#FFF0F9",
    centerOuter: "#F472B6",
    textColor: "#831843",
    bg: "#FDF2F8",
  },
  {
    emoji: "😌",
    label: "Calm",
    petalBase: "#A7F3D0",
    petalMid: "#6EE7B7",
    petalTip: "#10B981",
    petalHighlight: "#F0FDF4",
    centerInner: "#ECFDF5",
    centerOuter: "#34D399",
    textColor: "#064E3B",
    bg: "#F0FDF4",
  },
  {
    emoji: "😴",
    label: "Tired",
    petalBase: "#DDD6FE",
    petalMid: "#C4B5FD",
    petalTip: "#7C3AED",
    petalHighlight: "#F5F3FF",
    centerInner: "#FAF5FF",
    centerOuter: "#A78BFA",
    textColor: "#3B0764",
    bg: "#F5F3FF",
  },
  {
    emoji: "😢",
    label: "Sad",
    petalBase: "#BFDBFE",
    petalMid: "#93C5FD",
    petalTip: "#2563EB",
    petalHighlight: "#EFF6FF",
    centerInner: "#EFF6FF",
    centerOuter: "#60A5FA",
    textColor: "#1E3A8A",
    bg: "#EFF6FF",
  },
  {
    emoji: "😰",
    label: "Anxious",
    petalBase: "#FECACA",
    petalMid: "#FCA5A5",
    petalTip: "#DC2626",
    petalHighlight: "#FEF2F2",
    centerInner: "#FFF5F5",
    centerOuter: "#F87171",
    textColor: "#7F1D1D",
    bg: "#FEF2F2",
  },
  {
    emoji: "😤",
    label: "Irritated",
    petalBase: "#FED7AA",
    petalMid: "#FDBA74",
    petalTip: "#EA580C",
    petalHighlight: "#FFF7ED",
    centerInner: "#FFFBEB",
    centerOuter: "#FB923C",
    textColor: "#7C2D12",
    bg: "#FFF7ED",
  },
];

type Mood = (typeof MOODS)[number];

/* ── Realistic 5-petal flower SVG ─────────────────────────────────── */
function RealisticFlower({ mood, isSelected, size = 72 }: { mood: Mood; isSelected: boolean; size?: number }) {
  const id = mood.label.toLowerCase();
  const op = isSelected ? 1 : 0.72;

  // Petal path: rounded at tip, tapers to base. Drawn pointing straight up (–Y).
  // viewBox is –50 –50 100 100 so (0,0) is centre.
  const petalPath = "M 0,10 C -6,8 -16,-2 -16,-22 C -16,-40 -8,-52 0,-54 C 8,-52 16,-40 16,-22 C 16,-2 6,8 0,10";
  const veinPath = "M 0,8 Q 0,-20 0,-52";

  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        {/* Petal gradient: bright at tip, softer at base */}
        <linearGradient id={`pg-${id}`} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor={mood.petalHighlight} stopOpacity="0.9" />
          <stop offset="40%" stopColor={mood.petalBase} />
          <stop offset="75%" stopColor={mood.petalMid} />
          <stop offset="100%" stopColor={mood.petalTip} />
        </linearGradient>

        {/* Center gradient: soft glow */}
        <radialGradient id={`cg-${id}`} cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor={mood.centerInner} />
          <stop offset="55%" stopColor={mood.centerOuter} stopOpacity="0.85" />
          <stop offset="100%" stopColor={mood.petalTip} stopOpacity="0.6" />
        </radialGradient>

        {/* Petal shadow for depth */}
        <radialGradient id={`ps-${id}`} cx="50%" cy="110%" r="70%">
          <stop offset="0%" stopColor={mood.petalTip} stopOpacity="0.25" />
          <stop offset="100%" stopColor={mood.petalTip} stopOpacity="0" />
        </radialGradient>

        {/* Soft drop shadow filter */}
        <filter id={`f-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor={mood.petalTip} floodOpacity={isSelected ? 0.35 : 0.15} />
        </filter>
      </defs>

      <g opacity={op} filter={`url(#f-${id})`}>
        {/* 5 petals at 72° intervals */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            {/* Main petal body */}
            <path d={petalPath} fill={`url(#pg-${id})`} />
            {/* Shadow overlay at base of petal for depth */}
            <path d={petalPath} fill={`url(#ps-${id})`} />
            {/* Centre vein line */}
            <path
              d={veinPath}
              fill="none"
              stroke={mood.petalTip}
              strokeWidth="0.8"
              strokeOpacity="0.3"
              strokeLinecap="round"
            />
            {/* Highlight line along one side */}
            <path
              d="M 0,8 C -4,5 -10,-8 -9,-28"
              fill="none"
              stroke="white"
              strokeWidth="1.2"
              strokeOpacity="0.45"
              strokeLinecap="round"
            />
          </g>
        ))}

        {/* Pollen centre disc */}
        <circle cx="0" cy="0" r="17" fill={`url(#cg-${id})`} />

        {/* Pollen texture dots */}
        {[0, 60, 120, 180, 240, 300].map((a) => {
          const rx = 9 * Math.cos((a * Math.PI) / 180);
          const ry = 9 * Math.sin((a * Math.PI) / 180);
          return <circle key={a} cx={rx} cy={ry} r="1.8" fill={mood.petalTip} opacity="0.4" />;
        })}
        {/* Inner pollen ring */}
        {[30, 90, 150, 210, 270, 330].map((a) => {
          const rx = 5 * Math.cos((a * Math.PI) / 180);
          const ry = 5 * Math.sin((a * Math.PI) / 180);
          return <circle key={a} cx={rx} cy={ry} r="1.2" fill={mood.petalTip} opacity="0.3" />;
        })}

        {/* Centre highlight */}
        <circle cx="-4" cy="-4" r="5" fill="white" opacity="0.35" />

        {/* Selected glow ring */}
        {isSelected && (
          <circle cx="0" cy="0" r="18" fill="none" stroke={mood.petalTip} strokeWidth="2" strokeOpacity="0.6" />
        )}
      </g>
    </svg>
  );
}

/* ── Flower button ────────────────────────────────────────────────── */
function FlowerButton({ mood, isSelected, onClick }: { mood: Mood; isSelected: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.86 }}
      animate={{ scale: isSelected ? 1.08 : 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 focus:outline-none relative"
    >
      <div className="relative">
        <RealisticFlower mood={mood} isSelected={isSelected} />
        {/* Emoji overlaid on centre */}
        <span
          className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
          style={{ fontSize: isSelected ? 22 : 19, lineHeight: 1 }}
        >
          {mood.emoji}
        </span>
      </div>
      <span
        className="text-[10.5px] font-semibold tracking-tight"
        style={{ color: isSelected ? mood.textColor : "#aaa" }}
      >
        {mood.label}
      </span>
    </motion.button>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function Mood() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<MoodEntry[]>(storage.getMoods().slice(0, 7));
  const { toast } = useToast();

  const handleSave = () => {
    if (!selectedMood) return;
    const newMood = storage.addMood({ date: new Date().toISOString(), mood: selectedMood, note });
    setHistory((prev) => [newMood, ...prev].slice(0, 7));
    setSelectedMood(null);
    setNote("");
    toast({ title: "Mood logged 🌸", description: "Your feelings have been safely recorded." });
  };

  const selected = MOODS.find((m) => `${m.emoji} ${m.label}` === selectedMood);

  return (
    <PageTransition className="flex flex-col min-h-screen">
      <AppHeader title="How are you?" subtitle="Take a deep breath and check in." />

      <main className="flex-1 px-5 pt-2 pb-28 flex flex-col gap-5">

        {/* Flower mood picker */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
          <p className="text-xs text-muted-foreground text-center mb-4 font-medium">Tap to express your mood</p>

          {/* Row 1: 4 moods */}
          <div className="flex justify-around mb-3">
            {MOODS.slice(0, 4).map((m) => (
              <FlowerButton
                key={m.label}
                mood={m}
                isSelected={selectedMood === `${m.emoji} ${m.label}`}
                onClick={() => setSelectedMood(`${m.emoji} ${m.label}`)}
              />
            ))}
          </div>

          {/* Row 2: 3 moods centred */}
          <div className="flex justify-around px-8">
            {MOODS.slice(4).map((m) => (
              <FlowerButton
                key={m.label}
                mood={m}
                isSelected={selectedMood === `${m.emoji} ${m.label}`}
                onClick={() => setSelectedMood(`${m.emoji} ${m.label}`)}
              />
            ))}
          </div>

          {/* Selection banner */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-4 py-2.5 rounded-2xl text-center text-sm font-semibold"
                style={{ background: selected.bg, color: selected.textColor }}
              >
                {selected.emoji} Feeling {selected.label.toLowerCase()} today
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Note */}
        <section className="flex flex-col gap-3">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border focus-within:ring-2 ring-primary/20 transition-all">
            <Textarea
              placeholder="Add a gentle note about your day… (optional)"
              className="min-h-[88px] border-0 focus-visible:ring-0 resize-none px-0 py-0 text-sm bg-transparent placeholder:text-muted-foreground/70"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            className="w-full rounded-2xl h-12 text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            disabled={!selectedMood}
            onClick={handleSave}
          >
            Save for myself
          </Button>
        </section>

        {/* History */}
        {history.length > 0 && (
          <section>
            <h3 className="text-base font-semibold mb-3 px-1">Recent check-ins</h3>
            <div className="flex flex-col gap-2.5">
              {history.map((entry) => {
                const emoji = entry.mood.split(" ")[0];
                const label = entry.mood.split(" ")[1];
                const meta = MOODS.find((m) => m.label === label);
                return (
                  <div
                    key={entry.id}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-3.5 border border-white/80 flex gap-3 items-center shadow-sm"
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: meta?.bg ?? "#f3f4f6" }}
                    >
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-semibold text-sm" style={{ color: meta?.textColor ?? "#374151" }}>{label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(entry.date), "MMM d, h:mm a")}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground truncate">{entry.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </PageTransition>
  );
}
