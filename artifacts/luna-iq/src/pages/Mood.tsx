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
    petalColor: "#FDE68A",
    petalDark: "#FCD34D",
    center: "#FEF9C3",
    ring: "#FCA5A5",
    textColor: "#92400E",
  },
  {
    emoji: "😄",
    label: "Happy",
    petalColor: "#F9A8D4",
    petalDark: "#F472B6",
    center: "#FCE7F3",
    ring: "#F9A8D4",
    textColor: "#9D174D",
  },
  {
    emoji: "😌",
    label: "Calm",
    petalColor: "#6EE7B7",
    petalDark: "#34D399",
    center: "#D1FAE5",
    ring: "#6EE7B7",
    textColor: "#065F46",
  },
  {
    emoji: "😴",
    label: "Tired",
    petalColor: "#C4B5FD",
    petalDark: "#A78BFA",
    center: "#EDE9FE",
    ring: "#C4B5FD",
    textColor: "#4C1D95",
  },
  {
    emoji: "😢",
    label: "Sad",
    petalColor: "#93C5FD",
    petalDark: "#60A5FA",
    center: "#DBEAFE",
    ring: "#93C5FD",
    textColor: "#1E3A8A",
  },
  {
    emoji: "😰",
    label: "Anxious",
    petalColor: "#FCA5A5",
    petalDark: "#F87171",
    center: "#FEE2E2",
    ring: "#FCA5A5",
    textColor: "#7F1D1D",
  },
  {
    emoji: "😤",
    label: "Irritated",
    petalColor: "#FDBA74",
    petalDark: "#FB923C",
    center: "#FEF3C7",
    ring: "#FDBA74",
    textColor: "#7C2D12",
  },
];

type Mood = typeof MOODS[number];

function FlowerButton({ mood, isSelected, onClick }: { mood: Mood; isSelected: boolean; onClick: () => void }) {
  const op = isSelected ? 1 : 0.55;
  const scale = isSelected ? 1 : 0.95;

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      animate={{ scale }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 focus:outline-none"
    >
      <div className="relative w-[68px] h-[68px]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          {/* 8-petal flower: 4 axis + 4 diagonal */}
          {/* Cardinal petals */}
          <ellipse cx="50" cy="20" rx="13" ry="20" fill={mood.petalColor} opacity={op} />
          <ellipse cx="80" cy="50" rx="20" ry="13" fill={mood.petalColor} opacity={op} />
          <ellipse cx="50" cy="80" rx="13" ry="20" fill={mood.petalColor} opacity={op} />
          <ellipse cx="20" cy="50" rx="20" ry="13" fill={mood.petalColor} opacity={op} />
          {/* Diagonal petals */}
          <ellipse cx="71" cy="29" rx="13" ry="20" fill={mood.petalDark} opacity={op * 0.75} transform="rotate(-45 71 29)" />
          <ellipse cx="71" cy="71" rx="13" ry="20" fill={mood.petalDark} opacity={op * 0.75} transform="rotate(45 71 71)" />
          <ellipse cx="29" cy="71" rx="13" ry="20" fill={mood.petalDark} opacity={op * 0.75} transform="rotate(-45 29 71)" />
          <ellipse cx="29" cy="29" rx="13" ry="20" fill={mood.petalDark} opacity={op * 0.75} transform="rotate(45 29 29)" />
          {/* Center disc */}
          <circle cx="50" cy="50" r="27" fill={mood.center} />
          {/* Selected ring */}
          {isSelected && (
            <circle cx="50" cy="50" r="27" fill="none" stroke={mood.petalDark} strokeWidth="2.5" />
          )}
        </svg>
        {/* Emoji */}
        <span
          className="absolute inset-0 flex items-center justify-center select-none"
          style={{ fontSize: isSelected ? 26 : 22 }}
        >
          {mood.emoji}
        </span>
      </div>
      <span
        className="text-[11px] font-semibold tracking-tight"
        style={{ color: isSelected ? mood.textColor : "#9ca3af" }}
      >
        {mood.label}
      </span>
    </motion.button>
  );
}

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

      <main className="flex-1 px-5 pt-2 pb-28 flex flex-col gap-6">

        {/* Flower mood picker */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
          <p className="text-xs text-muted-foreground text-center mb-5 font-medium">Tap your mood</p>

          {/* Row 1: 4 moods */}
          <div className="flex justify-around mb-4">
            {MOODS.slice(0, 4).map((m) => (
              <FlowerButton
                key={m.label}
                mood={m}
                isSelected={selectedMood === `${m.emoji} ${m.label}`}
                onClick={() => setSelectedMood(`${m.emoji} ${m.label}`)}
              />
            ))}
          </div>

          {/* Row 2: 3 moods centered */}
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

          {/* Selected mood label */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-5 py-2.5 rounded-2xl text-center text-sm font-semibold"
                style={{ background: selected.center, color: selected.textColor }}
              >
                {selected.emoji} Feeling {selected.label.toLowerCase()} today
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Note Input */}
        <section className="flex flex-col gap-3">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border focus-within:ring-2 ring-primary/20 transition-all">
            <Textarea
              placeholder="Add a gentle note about your day… (optional)"
              className="min-h-[90px] border-0 focus-visible:ring-0 resize-none px-0 py-0 text-sm bg-transparent placeholder:text-muted-foreground/70"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button
            className="w-full rounded-2xl h-13 text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
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
                const moodMeta = MOODS.find((m) => m.label === label);
                return (
                  <div
                    key={entry.id}
                    className="bg-white/70 backdrop-blur-sm rounded-2xl p-3.5 border border-white/80 flex gap-3 items-center shadow-sm"
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: moodMeta?.center ?? "#f3f4f6" }}
                    >
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-semibold text-sm text-foreground">{label}</span>
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
