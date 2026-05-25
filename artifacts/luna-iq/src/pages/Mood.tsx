import { useState, useMemo, useCallback, useEffect } from "react";
import { storage } from "@/utils/storage";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { format, addDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { MOODS, MoodFlower } from "@/components/MoodFlower";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCycle } from "@/contexts/CycleContext";
import { addPoints } from "@/lib/points";
import type { CyclePhase } from "@/utils/cycle";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function syncMoodToBackend(
  userId: string,
  mood: string,
  phase: CyclePhase,
  currentDay: number,
) {
  const today = todayKey();
  const symptoms = storage.getSymptomsArray(today);
  try {
    await fetch(`${BASE}/api/luna/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        date: today,
        cyclePhase: phase === "Unknown" ? "Not Set" : phase,
        dayOfCycle: currentDay > 0 ? currentDay : undefined,
        mood,
        symptoms,
      }),
    });
  } catch {
    // Non-critical
  }
}

export default function Mood() {
  const { user } = useAuth();
  const { phase, currentDay } = useCycle();
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [calendarVersion, setCalendarVersion] = useState(0);

  const today = todayKey();
  const latestMood = storage.getLatestMood();
  const loggedToday =
    !!latestMood &&
    (latestMood.date.startsWith(today) ||
      new Date(latestMood.date).toDateString() === new Date().toDateString());

  useEffect(() => {
    if (loggedToday && latestMood) {
      setSelectedMood(latestMood.mood);
      setNote(latestMood.note ?? "");
    }
  }, [loggedToday, latestMood?.id]);

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
        map[dateKey] = {
          emoji,
          label,
          note: m.note ?? "",
          bg: meta?.bg ?? "#f3f4f6",
          textColor: meta?.textColor ?? "#374151",
        };
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh calendar after save
  }, [calendarVersion]);

  const calendarDays = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const d = addDays(new Date(), -(27 - i));
      const key = format(d, "yyyy-MM-dd");
      const entry = moodEntryMap[key] ?? null;
      return { key, entry, day: format(d, "d"), dateLabel: format(d, "EEEE, MMM d") };
    });
  }, [moodEntryMap]);

  const selectedMeta = selectedMood
    ? MOODS.find((m) => `${m.emoji} ${m.label}` === selectedMood)
    : null;

  const handleSave = useCallback(async () => {
    if (!selectedMood) {
      toast({ title: "Pick a mood first", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      storage.addMood({
        date: today,
        mood: selectedMood,
        note: note.trim(),
      });
      setCalendarVersion((v) => v + 1);

      if (user?.id) {
        await syncMoodToBackend(user.id, selectedMood, phase, currentDay);
        const { awarded, bonus } = await addPoints(user.id, "mood_checkin");
        if (awarded) {
          toast({
            title: "+3 Luna Points earned 💜",
            description:
              bonus > 0 ? `Streak bonus: +${bonus} pts! 🔥` : "Thanks for checking in today",
          });
        } else {
          toast({ title: "Mood saved 🌸", description: "You're checked in for today" });
        }
      } else {
        toast({ title: "Mood saved 🌸" });
      }
    } finally {
      setSaving(false);
    }
  }, [selectedMood, note, today, user?.id, phase, currentDay, toast]);

  return (
    <PageTransition className="flex flex-col min-h-screen">
      <AppHeader title="Mood" subtitle="Tap how you feel, then save" />

      <main className="flex-1 px-5 pt-2 pb-24 flex flex-col gap-4">
        {/* ── Log today — emojis + save in one thumb-friendly block ── */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
          <p className="text-sm font-semibold text-foreground mb-0.5">
            How are you feeling today?
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {loggedToday
              ? "You can update today's mood anytime"
              : "Choose an emoji, then tap save"}
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between gap-1">
              {MOODS.slice(0, 4).map((m) => {
                const key = `${m.emoji} ${m.label}`;
                const isSelected = selectedMood === key;
                return (
                  <motion.button
                    key={m.label}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    animate={{ scale: isSelected ? 1.06 : 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    onClick={() => setSelectedMood(key)}
                    className="flex flex-1 flex-col items-center gap-1.5 focus:outline-none min-w-0"
                  >
                    <MoodFlower mood={m} isSelected={isSelected} size={64} emojiSize={isSelected ? 34 : 28} />
                    <span
                      className="text-[10px] font-semibold truncate w-full text-center"
                      style={{ color: isSelected ? m.textColor : "#9ca3af" }}
                    >
                      {m.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex justify-center gap-6 px-2">
              {MOODS.slice(4).map((m) => {
                const key = `${m.emoji} ${m.label}`;
                const isSelected = selectedMood === key;
                return (
                  <motion.button
                    key={m.label}
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    animate={{ scale: isSelected ? 1.06 : 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    onClick={() => setSelectedMood(key)}
                    className="flex flex-col items-center gap-1.5 focus:outline-none"
                  >
                    <MoodFlower mood={m} isSelected={isSelected} size={64} emojiSize={isSelected ? 34 : 28} />
                    <span
                      className="text-[10px] font-semibold"
                      style={{ color: isSelected ? m.textColor : "#9ca3af" }}
                    >
                      {m.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {selectedMeta && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-4 py-2.5 rounded-2xl text-center text-xs font-semibold"
                style={{ background: selectedMeta.bg, color: selectedMeta.textColor }}
              >
                {selectedMeta.emoji} Feeling {selectedMeta.label.toLowerCase()} today
              </motion.p>
            )}
          </AnimatePresence>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            className="mt-3 w-full bg-muted/30 rounded-xl px-3 py-2.5 text-sm outline-none border border-border/30 focus:border-purple-300 transition-colors"
          />

          <motion.button
            type="button"
            disabled={!selectedMood || saving}
            whileTap={selectedMood && !saving ? { scale: 0.97 } : undefined}
            onClick={() => void handleSave()}
            className="mt-4 w-full py-3.5 rounded-2xl text-sm font-semibold text-white shadow-md transition-opacity disabled:opacity-40 disabled:shadow-none"
            style={{
              background: selectedMood
                ? "linear-gradient(135deg, #7C3AED, #EC4899)"
                : "#d1d5db",
            }}
          >
            {saving ? "Saving…" : selectedMood ? "Save mood" : "Pick a mood to save"}
          </motion.button>
        </section>

        {/* ── History calendar ── */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Last 28 days
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div key={d} className="text-center text-[9px] text-muted-foreground font-semibold pb-1">
                {d}
              </div>
            ))}
            {calendarDays.map((d) => {
              const isSelected = selectedDay === d.key;
              const isToday = d.key === today;
              return d.entry ? (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : d.key)}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center text-center transition-all active:scale-90"
                  style={{
                    background: isSelected ? d.entry.bg : "#fdf4ff",
                    border: `2px solid ${isSelected ? d.entry.textColor + "60" : isToday ? "#c4b5fd" : "#e9d5ff"}`,
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
                  style={{
                    background: isToday ? "#faf5ff" : "#f9fafb",
                    border: isToday ? "2px dashed #c4b5fd" : "1px solid #f3f4f6",
                  }}
                >
                  <span className="text-[9px] text-muted-foreground/50">{d.day}</span>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {selectedDay && moodEntryMap[selectedDay] && (() => {
              const entry = moodEntryMap[selectedDay]!;
              const dayInfo = calendarDays.find((d) => d.key === selectedDay);
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
                    type="button"
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
