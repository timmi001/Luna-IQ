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

// ── Mood data — muted earthy palette matching rose-flower style ──────────────

const MOODS = [
  {
    label: "Radiant",
    moodKey: "🌟 Radiant",
    petalDark:   "#7A6018",
    petalMid:    "#A88428",
    petalLight:  "#C8A848",
    centerColor: "#B49030",
    centerLight: "#D4B058",
    faceColor:   "#5A4010",
    expression:  "radiant" as const,
    bg:          "#F2E5C0",
    textColor:   "#5A4010",
  },
  {
    label: "Happy",
    moodKey: "😄 Happy",
    petalDark:   "#845060",
    petalMid:    "#A87080",
    petalLight:  "#C89098",
    centerColor: "#B87888",
    centerLight: "#D4A8B0",
    faceColor:   "#5C2C3C",
    expression:  "happy" as const,
    bg:          "#EED8DC",
    textColor:   "#5C2C3C",
  },
  {
    label: "Calm",
    moodKey: "😌 Calm",
    petalDark:   "#544280",
    petalMid:    "#7260A0",
    petalLight:  "#9884BC",
    centerColor: "#8070B0",
    centerLight: "#ACA0CC",
    faceColor:   "#342060",
    expression:  "calm" as const,
    bg:          "#E0DAEA",
    textColor:   "#342060",
  },
  {
    label: "Tired",
    moodKey: "😴 Tired",
    petalDark:   "#405848",
    petalMid:    "#5E7A64",
    petalLight:  "#829C84",
    centerColor: "#6C8870",
    centerLight: "#94AC94",
    faceColor:   "#243428",
    expression:  "tired" as const,
    bg:          "#D4E4D8",
    textColor:   "#243428",
  },
  {
    label: "Sad",
    moodKey: "😢 Sad",
    petalDark:   "#604050",
    petalMid:    "#885868",
    petalLight:  "#AA7880",
    centerColor: "#946070",
    centerLight: "#BC9098",
    faceColor:   "#40202C",
    expression:  "sad" as const,
    bg:          "#EAD8DC",
    textColor:   "#40202C",
  },
  {
    label: "Anxious",
    moodKey: "😰 Anxious",
    petalDark:   "#364868",
    petalMid:    "#506088",
    petalLight:  "#7080A0",
    centerColor: "#5C6E94",
    centerLight: "#8898B8",
    faceColor:   "#1E2C48",
    expression:  "anxious" as const,
    bg:          "#D4D8E8",
    textColor:   "#1E2C48",
  },
  {
    label: "Irritated",
    moodKey: "😤 Irritated",
    petalDark:   "#703030",
    petalMid:    "#964848",
    petalLight:  "#B87070",
    centerColor: "#A45858",
    centerLight: "#CC8888",
    faceColor:   "#4C1818",
    expression:  "irritated" as const,
    bg:          "#ECD8D8",
    textColor:   "#4C1818",
  },
];

type Mood = (typeof MOODS)[number];

// ── Rose/peony petal paths ─────────────────────────────────────────────────────
// Wide rounded petal pointing upward from center, tapering to rounded tip
const PETAL_FRONT =
  "M 0,2 C -16,2 -26,-12 -24,-30 C -22,-46 -10,-56 0,-58 C 10,-56 22,-46 24,-30 C 26,-12 16,2 0,2";
const PETAL_BACK =
  "M 0,2 C -14,2 -22,-10 -20,-26 C -18,-40 -8,-48 0,-50 C 8,-48 18,-40 20,-26 C 22,-10 14,2 0,2";
const VEIN = "M 0,1 Q 1,-22 0,-56";
const VEIN_BACK = "M 0,1 Q 1,-18 0,-48";

// ── SVG face expressions ───────────────────────────────────────────────────────
function FaceShape({ expression, color }: { expression: Mood["expression"]; color: string }) {
  const sw = 1.6;
  const sc = color;
  switch (expression) {
    case "radiant":
      return (
        <g fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          {/* Star eyes */}
          <line x1="-7" y1="-7" x2="-4" y2="-4" /><line x1="-4" y1="-7" x2="-7" y2="-4" />
          <line x1="4"  y1="-7" x2="7"  y2="-4" /><line x1="7"  y1="-7" x2="4"  y2="-4" />
          {/* Big cheerful smile */}
          <path d="M -8,3 Q 0,12 8,3" />
        </g>
      );
    case "happy":
      return (
        <g fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round">
          {/* Happy arch eyes */}
          <path d="M -8,-5 Q -5.5,-8 -3,-5" />
          <path d="M 3,-5 Q 5.5,-8 8,-5" />
          {/* Smile */}
          <path d="M -7,3 Q 0,10 7,3" />
        </g>
      );
    case "calm":
      return (
        <g strokeLinecap="round">
          {/* Soft closed eyes */}
          <circle cx="-5.5" cy="-5" r="2.2" fill={sc} />
          <circle cx="5.5"  cy="-5" r="2.2" fill={sc} />
          {/* Gentle smile */}
          <path d="M -5.5,4 Q 0,9 5.5,4" fill="none" stroke={sc} strokeWidth={sw} />
        </g>
      );
    case "tired":
      return (
        <g fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round">
          {/* Heavy drooping eyelids */}
          <path d="M -8,-3 Q -5.5,-7 -3,-3" />
          <path d="M -8,-3 Q -5.5,-1 -3,-3" />
          <path d="M 3,-3 Q 5.5,-7 8,-3" />
          <path d="M 3,-3 Q 5.5,-1 8,-3" />
          {/* Flat neutral mouth */}
          <line x1="-5.5" y1="5.5" x2="5.5" y2="5.5" />
        </g>
      );
    case "sad":
      return (
        <g fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round">
          {/* Downcast eyes — arches opening downward */}
          <path d="M -8,-4 Q -5.5,-7 -3,-4" />
          <path d="M 3,-4 Q 5.5,-7 8,-4" />
          {/* Frown */}
          <path d="M -6.5,7 Q 0,3 6.5,7" />
        </g>
      );
    case "anxious":
      return (
        <g fill="none" stroke={sc} strokeWidth={sw} strokeLinecap="round">
          {/* Wide worried eyes */}
          <circle cx="-5.5" cy="-5" r="3" />
          <circle cx="5.5"  cy="-5" r="3" />
          {/* Wavy anxious mouth */}
          <path d="M -6,5 Q -2,3 0,5 Q 2,7 6,5" />
        </g>
      );
    case "irritated":
      return (
        <g strokeLinecap="round" strokeLinejoin="round">
          {/* Furrowed brows */}
          <line x1="-9" y1="-8" x2="-3.5" y2="-5" stroke={sc} strokeWidth={sw} />
          <line x1="3.5" y1="-5" x2="9" y2="-8"  stroke={sc} strokeWidth={sw} />
          {/* Small set eyes */}
          <circle cx="-5.5" cy="-2" r="1.8" fill={sc} />
          <circle cx="5.5"  cy="-2" r="1.8" fill={sc} />
          {/* Tight frown */}
          <path d="M -5.5,6 Q 0,4 5.5,6" fill="none" stroke={sc} strokeWidth={sw} />
        </g>
      );
  }
}

// ── Rose flower SVG ───────────────────────────────────────────────────────────
function RoseFlower({ mood, isSelected, size = 76 }: { mood: Mood; isSelected: boolean; size?: number }) {
  const id = mood.label;

  return (
    <svg
      viewBox="-60 -62 120 124"
      width={size}
      height={size}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        {/* Back-layer petal gradient */}
        <linearGradient id={`pbg-${id}`} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor={mood.petalLight} stopOpacity="0.6" />
          <stop offset="100%" stopColor={mood.petalDark} stopOpacity="0.8" />
        </linearGradient>

        {/* Front-layer petal gradient: light at base fading to mid at tip */}
        <linearGradient id={`pfg-${id}`} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={mood.petalLight} />
          <stop offset="45%"  stopColor={mood.petalMid} />
          <stop offset="100%" stopColor={mood.petalDark} />
        </linearGradient>

        {/* Petal edge shadow overlay */}
        <linearGradient id={`psg-${id}`} x1="1" y1="0" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor={mood.petalDark} stopOpacity="0.35" />
          <stop offset="30%"  stopColor={mood.petalDark} stopOpacity="0" />
          <stop offset="70%"  stopColor={mood.petalDark} stopOpacity="0" />
          <stop offset="100%" stopColor={mood.petalDark} stopOpacity="0.35" />
        </linearGradient>

        {/* Center disc gradient */}
        <radialGradient id={`cg-${id}`} cx="40%" cy="35%" r="65%">
          <stop offset="0%"   stopColor={mood.centerLight} />
          <stop offset="100%" stopColor={mood.centerColor} />
        </radialGradient>

        {/* Drop shadow filter */}
        <filter id={`sh-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4"
            floodColor={mood.petalDark}
            floodOpacity={isSelected ? 0.5 : 0.28} />
        </filter>
      </defs>

      <g opacity={isSelected ? 1 : 0.80} filter={`url(#sh-${id})`}>

        {/* ── Back petal layer (offset 36° so they fill gaps) ── */}
        {[36, 108, 180, 252, 324].map((a) => (
          <g key={`b${a}`} transform={`rotate(${a})`}>
            <path d={PETAL_BACK} fill={`url(#pbg-${id})`} />
            <path d={VEIN_BACK}  fill="none" stroke={mood.petalDark}
              strokeWidth="0.7" strokeOpacity="0.3" strokeLinecap="round" />
          </g>
        ))}

        {/* ── Front petal layer ── */}
        {[0, 72, 144, 216, 288].map((a) => (
          <g key={`f${a}`} transform={`rotate(${a})`}>
            <path d={PETAL_FRONT} fill={`url(#pfg-${id})`} />
            {/* Edge shadow overlay for 3D depth */}
            <path d={PETAL_FRONT} fill={`url(#psg-${id})`} />
            {/* Centre vein */}
            <path d={VEIN} fill="none" stroke={mood.petalDark}
              strokeWidth="0.9" strokeOpacity="0.28" strokeLinecap="round" />
            {/* Highlight on left side */}
            <path d="M -10,-2 Q -14,-24 -10,-50"
              fill="none" stroke="white"
              strokeWidth="1.3" strokeOpacity="0.22" strokeLinecap="round" />
          </g>
        ))}

        {/* ── Center disc ── */}
        <circle cx="0" cy="0" r="23" fill={`url(#cg-${id})`} />
        {/* Subtle rim */}
        <circle cx="0" cy="0" r="23" fill="none"
          stroke={mood.centerColor} strokeWidth="1.2" strokeOpacity="0.4" />
        {/* Highlight gloss */}
        <ellipse cx="-6" cy="-7" rx="7" ry="5.5"
          fill="white" opacity="0.22" transform="rotate(-20,-6,-7)" />

        {/* ── Drawn face ── */}
        <FaceShape expression={mood.expression} color={mood.faceColor} />

        {/* ── Selected ring ── */}
        {isSelected && (
          <circle cx="0" cy="0" r="24.5" fill="none"
            stroke={mood.petalMid} strokeWidth="2.5" strokeOpacity="0.9" />
        )}
      </g>
    </svg>
  );
}

// ── Flower button ─────────────────────────────────────────────────────────────
function FlowerButton({
  mood,
  isSelected,
  onClick,
}: {
  mood: Mood;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.84 }}
      animate={{ scale: isSelected ? 1.10 : 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 focus:outline-none"
    >
      <RoseFlower mood={mood} isSelected={isSelected} />
      <span
        className="text-[10.5px] font-semibold tracking-tight transition-colors"
        style={{ color: isSelected ? mood.textColor : "#9ca3af" }}
      >
        {mood.label}
      </span>
    </motion.button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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

  const selected = MOODS.find((m) => m.moodKey === selectedMood);

  return (
    <PageTransition className="flex flex-col min-h-screen">
      <AppHeader title="How are you?" subtitle="Take a deep breath and check in." />

      <main className="flex-1 px-5 pt-2 pb-20 flex flex-col gap-4">

        {/* Rose flower mood picker */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
          <p className="text-xs text-muted-foreground text-center mb-4 font-medium">
            Tap to express your mood
          </p>

          {/* Row 1: 4 moods */}
          <div className="flex justify-around mb-2">
            {MOODS.slice(0, 4).map((m) => (
              <FlowerButton
                key={m.label}
                mood={m}
                isSelected={selectedMood === m.moodKey}
                onClick={() => setSelectedMood(m.moodKey)}
              />
            ))}
          </div>

          {/* Row 2: 3 moods centred */}
          <div className="flex justify-around px-8">
            {MOODS.slice(4).map((m) => (
              <FlowerButton
                key={m.label}
                mood={m}
                isSelected={selectedMood === m.moodKey}
                onClick={() => setSelectedMood(m.moodKey)}
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
                Feeling {selected.label.toLowerCase()} today
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
                const label = entry.mood.split(" ").slice(1).join(" ");
                const meta = MOODS.find((m) => m.label === label);
                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-2xl p-3.5 border border-card-border flex gap-3 items-center shadow-sm"
                  >
                    {/* Mini rose flower in history */}
                    <div className="flex-shrink-0">
                      {meta ? (
                        <RoseFlower mood={meta} isSelected={false} size={44} />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-semibold text-sm" style={{ color: meta?.textColor ?? "#374151" }}>
                          {label}
                        </span>
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
