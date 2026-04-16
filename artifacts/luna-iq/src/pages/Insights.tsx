import { storage } from "@/utils/storage";
import { getCycleDetails, getPhaseMessage, CyclePhase, getPhaseColor } from "@/utils/cycle";
import { AppHeader } from "@/components/AppHeader";
import { PageTransition } from "@/components/PageTransition";
import { Flame, Sparkles, Droplets } from "lucide-react";
import { format } from "date-fns";

export default function Insights() {
  const latestMood = storage.getLatestMood();
  const cycleData = storage.getCycle();
  const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);
  const streak = storage.getMoodStreak();

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

        {/* Phase Insight */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-card-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold uppercase tracking-wider text-xs text-emerald-800">Body Wisdom</h3>
          </div>
          
          {phase !== "Unknown" ? (
            <div className="flex flex-col gap-4">
              <div className={`inline-flex items-center self-start px-3 py-1 rounded-full text-xs font-semibold ${getPhaseColor(phase as CyclePhase).replace('bg-', 'bg-opacity-30 bg-')}`}>
                {phase} • Day {currentDay}
              </div>
              <p className="text-base text-foreground leading-relaxed">
                {getPhaseMessage(phase as CyclePhase)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Track your cycle to receive personalized body insights.</p>
          )}
        </div>

        {/* Latest Mood */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-card-border">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold uppercase tracking-wider text-xs text-blue-800">Emotional State</h3>
          </div>

          {latestMood ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{latestMood.mood.split(' ')[0]}</span>
                  <span className="font-medium text-lg">{latestMood.mood.split(' ')[1]}</span>
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
