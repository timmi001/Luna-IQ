import { useState } from "react";
import { storage, MoodEntry } from "@/utils/storage";
import { getCycleDetails } from "@/utils/cycle";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

/* ── Cup flower SVG — rounded petals in a rose/ranunculus style ──── */
function RealisticFlower({ mood, isSelected, size = 76 }: { mood: Mood; isSelected: boolean; size?: number }) {
  const id = mood.label.toLowerCase();
  const op = isSelected ? 1 : 0.75;

  // Wide, rounded petal — oval with blunt tip, much less pointed than a star
  const outerPetal = "M 0,12 C -14,12 -26,0 -25,-18 C -24,-34 -13,-47 0,-49 C 13,-47 24,-34 25,-18 C 26,0 14,12 0,12";
  // Inner petal layer — slightly smaller, sits on top
  const innerPetal = "M 0,8 C -9,8 -17,0 -16,-13 C -15,-25 -8,-33 0,-34 C 8,-33 15,-25 16,-13 C 17,0 9,8 0,8";

  return (
    <svg
      viewBox="-54 -52 108 108"
      width={size}
      height={size}
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        {/* Outer petal gradient — rich colour at tip, lighter at base */}
        <linearGradient id={`pg-${id}`} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={mood.petalHighlight} stopOpacity="0.95" />
          <stop offset="35%"  stopColor={mood.petalBase} />
          <stop offset="70%"  stopColor={mood.petalMid} />
          <stop offset="100%" stopColor={mood.petalTip} />
        </linearGradient>

        {/* Inner petal gradient — slightly deeper to read as inner cup */}
        <linearGradient id={`ig-${id}`} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={mood.petalBase} stopOpacity="0.9" />
          <stop offset="50%"  stopColor={mood.petalMid} />
          <stop offset="100%" stopColor={mood.petalTip} />
        </linearGradient>

        {/* Centre radial glow */}
        <radialGradient id={`cg-${id}`} cx="38%" cy="35%" r="65%">
          <stop offset="0%"   stopColor={mood.centerInner} />
          <stop offset="55%"  stopColor={mood.centerOuter} stopOpacity="0.85" />
          <stop offset="100%" stopColor={mood.petalTip}    stopOpacity="0.55" />
        </radialGradient>

        {/* Drop shadow */}
        <filter id={`f-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5"
            floodColor={mood.petalTip}
            floodOpacity={isSelected ? 0.40 : 0.18} />
        </filter>
      </defs>

      <g opacity={op} filter={`url(#f-${id})`}>

        {/* ── Outer petals (5 × 72°) ── */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <g key={`o${angle}`} transform={`rotate(${angle})`}>
            <path d={outerPetal} fill={`url(#pg-${id})`} />
            {/* Edge shadow for petal depth */}
            <path d={outerPetal} fill={mood.petalTip} opacity="0.12" />
            {/* Centre vein */}
            <path d="M 0,10 Q 0,-18 0,-48"
              fill="none" stroke={mood.petalTip}
              strokeWidth="0.8" strokeOpacity="0.25" strokeLinecap="round" />
            {/* Highlight on left edge */}
            <path d="M -10,8 Q -15,-10 -12,-40"
              fill="none" stroke="white"
              strokeWidth="1.3" strokeOpacity="0.40" strokeLinecap="round" />
          </g>
        ))}

        {/* ── Inner petal layer (offset 36° — fills gaps between outer) ── */}
        {[36, 108, 180, 252, 324].map((angle) => (
          <g key={`i${angle}`} transform={`rotate(${angle})`}>
            <path d={innerPetal} fill={`url(#ig-${id})`} />
            <path d="M 0,7 Q 0,-12 0,-33"
              fill="none" stroke={mood.petalTip}
              strokeWidth="0.7" strokeOpacity="0.20" strokeLinecap="round" />
          </g>
        ))}

        {/* ── Centre disc ── */}
        <circle cx="0" cy="0" r="18" fill={`url(#cg-${id})`} />
        {/* Rim */}
        <circle cx="0" cy="0" r="18" fill="none"
          stroke={mood.petalTip} strokeWidth="1" strokeOpacity="0.25" />
        {/* Gloss highlight */}
        <circle cx="-5" cy="-5" r="5.5" fill="white" opacity="0.30" />

        {/* ── Selected ring ── */}
        {isSelected && (
          <circle cx="0" cy="0" r="19.5" fill="none"
            stroke={mood.petalTip} strokeWidth="2.2" strokeOpacity="0.65" />
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
        <span
          className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
          style={{
            fontSize: isSelected ? 28 : 24,
            lineHeight: 1,
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.18))",
          }}
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

  const handleSave = async () => {
    if (!selectedMood) return;
    const newMood = storage.addMood({ date: new Date().toISOString(), mood: selectedMood, note });
    setHistory((prev) => [newMood, ...prev].slice(0, 7));
    setSelectedMood(null);
    setNote("");
    toast({ title: "Mood logged 🌸", description: "Your feelings have been safely recorded." });

    try {
      const cycleData = storage.getCycle();
      const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);
      const symptoms: string[] = (() => {
        try {
          const raw = localStorage.getItem("luna_symptoms");
          if (!raw) return [];
          const entries = JSON.parse(raw) as { date: string; note: string }[];
          const today = new Date().toISOString().split("T")[0];
          const entry = entries.find((e) => e.date === today);
          if (!entry?.note) return [];
          return entry.note.split(",").map((s) => s.trim()).filter(Boolean);
        } catch { return []; }
      })();

      await fetch(`${BASE}/api/luna/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "guest",
          date: new Date().toISOString().split("T")[0],
          cyclePhase: phase === "Unknown" ? "Follicular" : phase,
          dayOfCycle: currentDay > 0 ? currentDay : undefined,
          mood: selectedMood,
          symptoms,
        }),
      });
    } catch {
      // Silently ignore — local save already succeeded
    }
  };

  const selected = MOODS.find((m) => `${m.emoji} ${m.label}` === selectedMood);

  return (
    <PageTransition className="flex flex-col min-h-screen">
      <AppHeader title="How are you?" subtitle="Take a deep breath and check in." />

      <main className="flex-1 px-5 pt-2 pb-20 flex flex-col gap-4">

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
