import { useState, useMemo } from "react";
import { storage } from "@/utils/storage";
import { getCycleDetails } from "@/utils/cycle";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { MOODS, MoodFlower, type MoodDef } from "@/components/MoodFlower";
import { useAuth } from "@/contexts/AuthContext";
import { addPoints } from "@/lib/points";

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
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const moodEntryMap = useMemo(() => {
    const moods = storage.getMoods();
    const map: Record<string, { emoji: string; label: string; note: string; bg: string; textColor: string }> = {};
    moods.forEach((m) => {
      const dateKey = m.date.split("T")[0]!;
      if (!map[dateKey]) {
        const parts = m.mood.split(" ");
        const emoji = parts[0] ?? "";
        const label = parts.slice(1).join(" ");
        const meta = MOODS.find((md) => md.label === label);
        map[dateKey] = { emoji, label, note: m.note ?? "", bg: meta?.bg ?? "#f3f4f6", textColor: meta?.textColor ?? "#374151" };
      }
    });
    return map;
  }, []);

  const calendarDays = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const d = addDays(new Date(), -(27 - i));
      const key = format(d, "yyyy-MM-dd");
      const entry = moodEntryMap[key] ?? null;
      return { key, entry, day: format(d, "d"), dateLabel: format(d, "EEEE, MMM d") };
    });
  }, [moodEntryMap]);

  const handleSave = async () => {
    if (!selectedMood) return;
    storage.addMood({ date: new Date().toISOString(), mood: selectedMood, note });
    setSelectedMood(null);
    setNote("");
    toast({ title: "Mood logged 🌸", description: "Your feelings have been safely recorded." });

    if (user?.id) {
      addPoints(user.id, "mood_checkin").then(({ awarded, bonus }) => {
        if (awarded) {
          toast({
            title: "+3 Luna Points earned 💜",
            description: bonus > 0 ? `Streak bonus: +${bonus} pts! 🔥` : "You're showing up for yourself today 🌸",
          });
        }
      }).catch(() => {});
    }

    try {
      const cycleData = storage.getCycle();
      const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);
      const today = new Date().toISOString().split("T")[0]!;
      const symptoms = storage.getSymptomsArray(today);

      await fetch(`${BASE}/api/luna/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "guest",
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
          <button
            disabled={!selectedMood}
            onClick={handleSave}
            className="w-full rounded-2xl h-13 text-base font-bold shadow-md active:scale-[0.98] transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#db2777)",
              color: "#fff",
              letterSpacing: "0.01em",
              boxShadow: selectedMood ? "0 4px 16px rgba(124,58,237,0.35)" : undefined,
              padding: "0.875rem 0",
            }}
          >
            Save for myself
          </button>
        </section>

        {/* Mood calendar — last 28 days */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
          <p className="text-sm font-semibold mb-1">Mood Calendar</p>
          <p className="text-xs text-muted-foreground mb-4">Your last 28 days · tap a logged day</p>
          <div className="grid grid-cols-7 gap-1.5">
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
              <div key={d} className="text-center text-[9px] text-muted-foreground font-semibold pb-1">{d}</div>
            ))}
            {calendarDays.map(d => {
              const isSelected = selectedDay === d.key;
              return d.entry ? (
                <button
                  key={d.key}
                  onClick={() => setSelectedDay(isSelected ? null : d.key)}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center text-center transition-all active:scale-90"
                  style={{
                    background: isSelected ? d.entry.bg : "#fdf4ff",
                    border: `2px solid ${isSelected ? d.entry.textColor + "60" : "#e9d5ff"}`,
                    boxShadow: isSelected ? `0 2px 10px ${d.entry.bg}` : undefined,
                    transform: isSelected ? "scale(1.12)" : undefined,
                  }}
                >
                  <span className="text-base leading-none">{d.entry.emoji}</span>
                </button>
              ) : (
                <div
                  key={d.key}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center text-center"
                  style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}
                >
                  <span className="text-[9px] text-muted-foreground/50">{d.day}</span>
                </div>
              );
            })}
          </div>

          {/* Pop-out detail panel */}
          <AnimatePresence>
            {selectedDay && moodEntryMap[selectedDay] && (() => {
              const entry = moodEntryMap[selectedDay]!;
              const dayInfo = calendarDays.find(d => d.key === selectedDay);
              return (
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="mt-4 rounded-2xl px-4 py-3.5 border flex gap-3 items-start"
                  style={{ background: entry.bg + "cc", borderColor: entry.textColor + "30" }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: entry.bg }}
                  >
                    {entry.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground mb-0.5">{dayInfo?.dateLabel}</p>
                    <p className="text-sm font-semibold" style={{ color: entry.textColor }}>
                      Feeling {entry.label}
                    </p>
                    {entry.note ? (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.note}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 mt-1 italic">No note written</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="text-muted-foreground/40 hover:text-muted-foreground text-lg leading-none mt-0.5 flex-shrink-0"
                  >
                    ×
                  </button>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </section>

      </main>
    </PageTransition>
  );
}
