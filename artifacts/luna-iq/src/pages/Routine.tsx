import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { addPoints } from "@/lib/points";

interface RoutineItem {
  id: string;
  label: string;
  emoji: string;
  done: boolean;
  time?: string;
}

const DEFAULT_ROUTINES: Omit<RoutineItem, "done">[] = [
  { id: "1", emoji: "☀️", label: "Morning stretch", time: "7:00 AM" },
  { id: "2", emoji: "💊", label: "Take vitamins", time: "8:00 AM" },
  { id: "3", emoji: "🧘‍♀️", label: "Mindful moment", time: "12:00 PM" },
  { id: "4", emoji: "🚶‍♀️", label: "Evening walk", time: "6:00 PM" },
  { id: "5", emoji: "📓", label: "Gratitude journal", time: "9:00 PM" },
  { id: "6", emoji: "🌙", label: "Wind-down routine", time: "10:00 PM" },
];

function getStoredRoutine(): RoutineItem[] {
  try {
    const raw = localStorage.getItem("luna_routine");
    if (!raw) return DEFAULT_ROUTINES.map((r) => ({ ...r, done: false }));
    const stored = JSON.parse(raw) as { items: RoutineItem[]; date: string };
    const today = new Date().toISOString().split("T")[0];
    if (stored.date !== today) {
      return stored.items.map((i) => ({ ...i, done: false }));
    }
    return stored.items;
  } catch {
    return DEFAULT_ROUTINES.map((r) => ({ ...r, done: false }));
  }
}

function saveRoutine(items: RoutineItem[]) {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem("luna_routine", JSON.stringify({ items, date: today }));
}

export default function Routine() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [items, setItems] = useState<RoutineItem[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newTime, setNewTime] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setItems(getStoredRoutine());
  }, []);

  const toggle = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      const next = prev.map((i) => i.id === id ? { ...i, done: !i.done } : i);
      saveRoutine(next);
      // Award points when checking an item off (not when unchecking)
      if (item && !item.done && user?.id) {
        addPoints(user.id, "quick_tool").catch(() => {});
      }
      return next;
    });
  };

  const remove = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveRoutine(next);
      return next;
    });
  };

  const addItem = () => {
    if (!newLabel.trim()) return;
    const item: RoutineItem = {
      id: Date.now().toString(),
      emoji: "✨",
      label: newLabel.trim(),
      time: newTime.trim() || undefined,
      done: false,
    };
    setItems((prev) => {
      const next = [...prev, item];
      saveRoutine(next);
      return next;
    });
    setNewLabel("");
    setNewTime("");
    setAdding(false);
  };

  const done = items.filter((i) => i.done).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  return (
    <PageTransition className="flex flex-col min-h-screen bg-gradient-to-b from-[#fdf4ff] to-[#faf5ff]">
      <header className="px-6 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">My Routine</h1>
          <p className="text-xs text-muted-foreground">{done}/{items.length} done today</p>
        </div>
      </header>

      <main className="flex-1 px-6 pb-20 flex flex-col gap-4">

        {/* Progress bar */}
        <div className="bg-white rounded-2xl p-4 border border-card-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">Today's progress</span>
            <span className="text-xs font-bold text-purple-500">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
            <motion.div
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#c4b5fd,#f9a8d4)" }}
            />
          </div>
          {pct === 100 && (
            <p className="text-xs text-center text-purple-500 mt-2 font-medium">🎉 You completed your routine!</p>
          )}
        </div>

        {/* Routine list */}
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${item.done ? "bg-purple-50/60 border-purple-100" : "bg-white border-card-border shadow-sm"}`}
              >
                <button
                  onClick={() => toggle(item.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all active:scale-90 ${item.done ? "bg-purple-400 border-purple-400" : "border-border/50 bg-white"}`}
                >
                  {item.done && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{item.emoji}</span>
                    <p className={`text-sm font-medium truncate ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.label}
                    </p>
                  </div>
                  {item.time && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 ml-6">{item.time}</p>
                  )}
                </div>
                <button onClick={() => remove(item.id)} className="w-6 h-6 flex items-center justify-center rounded-full bg-muted/30 flex-shrink-0">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add item */}
        <AnimatePresence>
          {adding ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm flex flex-col gap-3"
            >
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                placeholder="e.g. Evening skincare"
                className="text-sm bg-muted/30 rounded-xl px-3 py-2 outline-none border border-border/30 focus:border-purple-300 transition-colors"
              />
              <input
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="Time (optional, e.g. 8:00 PM)"
                className="text-sm bg-muted/30 rounded-xl px-3 py-2 outline-none border border-border/30 focus:border-purple-300 transition-colors"
              />
              <div className="flex gap-2">
                <button onClick={() => setAdding(false)} className="flex-1 py-2 rounded-xl text-sm text-muted-foreground border border-border/30 bg-muted/20">Cancel</button>
                <button
                  onClick={addItem}
                  disabled={!newLabel.trim()}
                  className="flex-1 py-2 rounded-xl text-sm text-white font-semibold disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,#c4b5fd,#f9a8d4)" }}
                >
                  Add
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-purple-200 text-sm text-purple-400 bg-purple-50/40 active:scale-98 transition-transform"
            >
              <Plus className="w-4 h-4" />
              Add new habit
            </motion.button>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}
