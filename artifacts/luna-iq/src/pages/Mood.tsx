import { useState, useMemo } from "react";
import { storage } from "@/utils/storage";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { format, addDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { MOODS } from "@/components/MoodFlower";

export default function Mood() {
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

  return (
    <PageTransition className="flex flex-col min-h-screen">
      <AppHeader title="Mood Calendar" subtitle="Your last 28 days · tap a logged day" />

      <main className="flex-1 px-5 pt-2 pb-20 flex flex-col gap-4">
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
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
