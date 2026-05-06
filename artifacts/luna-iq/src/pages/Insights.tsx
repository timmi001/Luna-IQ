import { useState, useEffect } from "react";
import { storage } from "@/utils/storage";
import { getCycleDetails, getPhaseColor, CyclePhase } from "@/utils/cycle";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { Flame, Sparkles, Droplets, RefreshCw, Heart, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Insight = {
  insight: string;
  pattern: string | null;
  suggestion: string;
  reassurance: string;
};

export default function Insights() {
  const latestMood = storage.getLatestMood();
  const cycleData = storage.getCycle();
  const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);
  const streak = storage.getMoodStreak();

  const [aiInsight, setAiInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/luna/generate-insight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "guest" }),
      });
      if (!res.ok) throw new Error("Failed to fetch insight");
      const data = await res.json() as Insight;
      setAiInsight(data);
    } catch {
      setError("Couldn't reach Luna right now. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, []);

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
            <button
              onClick={fetchInsight}
              disabled={loading}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/40 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
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
                <button onClick={fetchInsight} className="mt-3 text-xs font-semibold text-purple-500 hover:underline">
                  Try again
                </button>
              </motion.div>
            )}

            {!loading && aiInsight && (
              <motion.div
                key="insight"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                {/* Main insight */}
                <p className="text-sm text-foreground leading-relaxed">{aiInsight.insight}</p>

                {/* Pattern */}
                {aiInsight.pattern && (
                  <div className="bg-luna-lavender/20 rounded-2xl px-4 py-3 border border-purple-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-700">Pattern Detected</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{aiInsight.pattern}</p>
                  </div>
                )}

                {/* Suggestion */}
                <div className="bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Heart className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Gentle Suggestion</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{aiInsight.suggestion}</p>
                </div>

                {/* Reassurance */}
                <p className="text-sm text-center text-muted-foreground italic">{aiInsight.reassurance}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
            <p className="text-sm text-muted-foreground">No moods logged yet. Check in to see your emotional state.</p>
          )}
        </div>

      </main>
    </PageTransition>
  );
}
