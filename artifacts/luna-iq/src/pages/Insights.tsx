import { useState, useEffect, useCallback } from "react";
import { storage } from "@/utils/storage";
import { getCycleDetails, getPhaseColor, CyclePhase } from "@/utils/cycle";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { Flame, Sparkles, Droplets, RefreshCw, Heart, Lightbulb, PlusCircle, Zap } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function syncTodayToBackend(userId: string) {
  try {
    const cycleData = storage.getCycle();
    const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);
    const latestMood = storage.getLatestMood();
    const today = new Date().toISOString().split("T")[0]!;

    if (phase === "Unknown") return;

    const symptoms: string[] = (() => {
      try {
        const raw = localStorage.getItem("luna_symptoms");
        if (!raw) return [];
        const entries = JSON.parse(raw) as { date: string; note: string }[];
        const entry = entries.find((e) => e.date === today);
        if (!entry?.note) return [];
        return entry.note.split(",").map((s) => s.trim()).filter(Boolean);
      } catch { return []; }
    })();

    const moodToday =
      latestMood && latestMood.date.startsWith(today) ? latestMood.mood : "neutral";

    await fetch(`${BASE}/api/luna/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        date: today,
        cyclePhase: phase,
        dayOfCycle: currentDay,
        mood: moodToday,
        symptoms,
      }),
    });
  } catch {
    // Non-critical
  }
}

type Insight = {
  insight: string;
  pattern: string | null;
  suggestion: string;
  reassurance: string;
  isEncouragement?: boolean;
};

type DailyUpdate = {
  text: string;
  severity: "minor" | "significant";
};

export default function Insights() {
  const { user } = useAuth();
  const userId = user?.id ?? "guest";
  const latestMood = storage.getLatestMood();
  const cycleData = storage.getCycle();
  const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);
  const streak = storage.getMoodStreak();
  const [, navigate] = useLocation();

  const [aiInsight, setAiInsight] = useState<Insight | null>(null);
  const [dailyUpdates, setDailyUpdates] = useState<DailyUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/luna/today-updates/${userId}`);
      if (res.ok) {
        const { updates } = await res.json() as { updates: DailyUpdate[] };
        setDailyUpdates(updates);
      }
    } catch {
      // Non-critical
    }
  }, []);

  const loadInsight = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      // Check cache first (skip only on manual refresh)
      if (!forceRefresh) {
        const cacheRes = await fetch(`${BASE}/api/luna/today-insight/${userId}`);
        if (cacheRes.ok) {
          const { insight: cached } = await cacheRes.json() as { insight: Insight | null };
          if (cached) {
            setAiInsight(cached);
            setLoading(false);
            // Also load any same-day updates
            await fetchUpdates();
            return;
          }
        }
      }

      // No cache — sync today's data then ask Gemini
      await syncTodayToBackend(userId);

      const res = await fetch(`${BASE}/api/luna/generate-insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.status === 429) {
        setError("Luna is taking a short rest — daily limit reached. Check back tomorrow!");
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as Insight;
      setAiInsight(data);
      await fetchUpdates();
    } catch {
      setError("Couldn't reach Luna right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, [fetchUpdates]);

  useEffect(() => {
    loadInsight(false);
  }, [loadInsight]);

  const hasLoggedToday = (() => {
    const today = new Date().toISOString().split("T")[0]!;
    return !!(latestMood && latestMood.date.startsWith(today));
  })();

  const isEncouragement = aiInsight?.isEncouragement === true;

  return (
    <PageTransition className="flex flex-col min-h-screen">
      <AppHeader
        title="Insights"
        subtitle="Discover patterns in your wellness journey."
      />

      <main className="flex-1 px-6 pt-2 pb-28 flex flex-col gap-6">

        {/* Streak Card */}
        <div className="bg-gradient-to-br from-luna-peach/50 to-luna-lavender/40 rounded-3xl p-6 shadow-sm border border-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-white/40 rotate-12">
            <Flame className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold uppercase tracking-wider text-xs text-orange-800">Commitment</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">{streak}</span>
              <span className="text-sm font-medium text-muted-foreground">day streak</span>
            </div>
            <p className="text-sm mt-2 text-foreground/80 font-medium">
              {streak > 0
                ? "You're doing great taking time for yourself."
                : "Log your mood today to start a mindful streak."}
            </p>
          </div>
        </div>

        {/* Cycle Phase Badge */}
        {phase !== "Unknown" && (
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-card-border shadow-sm">
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getPhaseColor(phase as CyclePhase)}`}>
              {phase} · Day {currentDay}
            </div>
            <p className="text-xs text-muted-foreground flex-1">Your current cycle phase</p>
          </div>
        )}

        {/* AI Insight Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-card-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold uppercase tracking-wider text-xs text-purple-800">Luna's Insight</h3>
            </div>
            {!isEncouragement && (
              <button
                onClick={() => loadInsight(false)}
                disabled={loading}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/40 transition-colors disabled:opacity-40"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                {[80, 60, 70].map((w, i) => (
                  <div key={i} className="h-3 rounded-full bg-muted/50 animate-pulse" style={{ width: `${w}%` }} />
                ))}
              </motion.div>
            )}

            {!loading && error && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-sm text-muted-foreground">{error}</p>
                <button onClick={() => loadInsight(false)} className="mt-3 text-xs font-semibold text-purple-500 hover:underline">
                  Try again
                </button>
              </motion.div>
            )}

            {/* Encouragement state — no real logs yet */}
            {!loading && aiInsight && isEncouragement && (
              <motion.div
                key="encouragement"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5 py-2"
              >
                <div className="text-4xl">💜</div>
                <div className="text-center flex flex-col gap-1">
                  <p className="text-sm text-foreground leading-relaxed font-medium">{aiInsight.insight}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{aiInsight.suggestion}</p>
                  <p className="text-xs text-muted-foreground italic mt-1">{aiInsight.reassurance}</p>
                </div>
                <button
                  onClick={() => navigate("/mood")}
                  className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 transition-colors text-purple-700 font-semibold text-sm px-5 py-2.5 rounded-2xl border border-purple-200"
                >
                  <PlusCircle className="w-4 h-4" />
                  Log Today's Mood
                </button>
              </motion.div>
            )}

            {/* Normal insight state */}
            {!loading && aiInsight && !isEncouragement && (
              <motion.div
                key="insight"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                <p className="text-sm text-foreground leading-relaxed">{aiInsight.insight}</p>

                {aiInsight.pattern && (
                  <div className="bg-luna-lavender/20 rounded-2xl px-4 py-3 border border-purple-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-700">Pattern Detected</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{aiInsight.pattern}</p>
                  </div>
                )}

                <div className="bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Heart className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Gentle Suggestion</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{aiInsight.suggestion}</p>
                </div>

                <p className="text-sm text-center text-muted-foreground italic">{aiInsight.reassurance}</p>

                {/* Today's Updates — inside the insight card */}
                <AnimatePresence>
                  {dailyUpdates.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col gap-2 pt-2 border-t border-muted/30"
                    >
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Later Today</span>
                      </div>
                      {dailyUpdates.map((upd, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
                            upd.severity === "significant"
                              ? "bg-rose-50 border border-rose-200 text-rose-900"
                              : "bg-amber-50 border border-amber-200 text-amber-900"
                          }`}
                        >
                          {upd.text}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Log Today CTA — show if no mood logged today and insight loaded */}
        {!loading && aiInsight && !isEncouragement && !hasLoggedToday && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-purple-50 rounded-3xl px-5 py-4 border border-purple-100 flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-purple-800">Haven't checked in yet?</p>
              <p className="text-xs text-purple-600 mt-0.5">Log today's mood so Luna can keep up.</p>
            </div>
            <button
              onClick={() => navigate("/mood")}
              className="flex items-center gap-1.5 bg-purple-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Log
            </button>
          </motion.div>
        )}

        {/* Latest Mood */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-card-border">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold uppercase tracking-wider text-xs text-blue-800">Latest Check-in</h3>
          </div>

          {latestMood ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{latestMood.mood.split(" ")[0]}</span>
                  <span className="font-medium text-lg">{latestMood.mood.split(" ")[1]}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(latestMood.date), "MMM d")}
                </span>
              </div>
              {latestMood.note ? (
                <div className="bg-gray-50 rounded-2xl p-4 text-sm text-muted-foreground italic">
                  "{latestMood.note}"
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No note attached to your last check-in.</p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">No moods logged yet.</p>
              <button
                onClick={() => navigate("/mood")}
                className="text-xs font-semibold text-purple-500 hover:underline"
              >
                Log your first mood →
              </button>
            </div>
          )}
        </div>

      </main>
    </PageTransition>
  );
}
