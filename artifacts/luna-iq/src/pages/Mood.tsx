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
import { MOODS, MoodFlower, type MoodDef } from "@/components/MoodFlower";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Mood = MoodDef;

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
      <MoodFlower mood={mood} isSelected={isSelected} />
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
