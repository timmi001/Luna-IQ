import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, MessageCircleHeart, Wind, Droplets, ListChecks, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { storage } from "@/utils/storage";
import { getCycleDetails, getPhaseColor, getPhaseMessage, CyclePhase } from "@/utils/cycle";
import { PageTransition } from "@/components/PageTransition";

const AVATARS = [
  { emoji: "🌸", bg: "#FFF0F9" },
  { emoji: "🦋", bg: "#F5F3FF" },
  { emoji: "🌙", bg: "#EEF2FF" },
  { emoji: "🌺", bg: "#FFF7ED" },
  { emoji: "✨", bg: "#FEFCE8" },
  { emoji: "🌷", bg: "#FFF0F6" },
  { emoji: "💫", bg: "#EFF6FF" },
  { emoji: "🌻", bg: "#FEFCE8" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const profile = storage.getProfile();
  const latestMood = storage.getLatestMood();
  const cycleData = storage.getCycle();
  const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);
  const avatar = AVATARS[profile.avatarIndex ?? 0] ?? AVATARS[0];
  const name = profile.nickname ? `, ${profile.nickname}` : "";

  const moodEmoji = latestMood ? latestMood.mood.split(" ")[0] : "🤍";
  const moodLabel = latestMood ? latestMood.mood.split(" ")[1] : "Not logged";

  return (
    <PageTransition className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            {greeting}{name} <Sparkles className="w-5 h-5 text-luna-peach" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ready for a moment of mindfulness?</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation("/notifications")}
            className="relative w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center active:scale-95 transition-transform"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-400" />
          </button>
          <button
            onClick={() => setLocation("/profile")}
            className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm border border-card-border active:scale-95 transition-transform"
            style={{ background: avatar.bg, fontSize: 20 }}
          >
            {avatar.emoji}
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 pt-4 pb-28 flex flex-col gap-5">

        {/* Today's Check-in */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-luna-lavender/20 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
          <h2 className="text-base font-semibold text-foreground mb-3">Today's Check-in</h2>

          {/* Mood + Cycle — big cards */}
          <div className="flex gap-3">
            {/* Mood card */}
            <Link href="/mood" className="flex-1">
              <motion.div
                whileTap={{ scale: 0.96 }}
                className="bg-gradient-to-br from-luna-blush/40 to-pink-50 rounded-2xl p-4 border border-luna-blush/40 cursor-pointer flex flex-col gap-2 min-h-[96px]"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Mood</p>
                <span className="text-4xl leading-none">{moodEmoji}</span>
                <p className="text-sm font-semibold text-foreground/80">{moodLabel}</p>
              </motion.div>
            </Link>

            {/* Cycle card */}
            <Link href="/cycle" className="flex-1">
              <motion.div
                whileTap={{ scale: 0.96 }}
                className={`rounded-2xl p-4 border cursor-pointer flex flex-col gap-2 min-h-[96px] ${
                  phase !== "Unknown"
                    ? getPhaseColor(phase).replace("text-", "border-").replace("bg-", "bg-opacity-30 bg-")
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Cycle</p>
                <span className="text-4xl leading-none">🌙</span>
                <div>
                  <p className="text-sm font-semibold text-foreground/80 leading-tight">
                    {phase !== "Unknown" ? phase : "Not logged"}
                  </p>
                  {phase !== "Unknown" && (
                    <p className="text-xs text-muted-foreground">Day {currentDay}</p>
                  )}
                </div>
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Body Wisdom Card */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold uppercase tracking-wider text-xs text-emerald-800">Body Wisdom</h3>
          </div>
          {phase !== "Unknown" ? (
            <div className="flex flex-col gap-2">
              <div className={`inline-flex items-center self-start px-3 py-1 rounded-full text-xs font-semibold ${getPhaseColor(phase as CyclePhase).replace("bg-", "bg-opacity-30 bg-")}`}>
                {phase} · Day {currentDay}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{getPhaseMessage(phase as CyclePhase)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Track your cycle to receive personalized body insights.</p>
          )}
        </div>

        <h3 className="text-lg font-medium px-1">Your Spaces</h3>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/chat">
            <div className="bg-luna-lavender/40 hover:bg-luna-lavender/60 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-purple-500">
                <MessageCircleHeart className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-purple-900">Luna Chat</h3>
              <p className="text-xs text-purple-700/70 mt-1">Talk to your AI companion</p>
            </div>
          </Link>

          <Link href="/breathe">
            <div className="bg-sky-100/60 hover:bg-sky-100/80 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-sky-400">
                <Wind className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-sky-900">Breathe</h3>
              <p className="text-xs text-sky-700/70 mt-1">4 · 4 · 4 calm reset</p>
            </div>
          </Link>

          <Link href="/water">
            <div className="bg-cyan-50/80 hover:bg-cyan-100/60 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-cyan-500">
                <Droplets className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-cyan-900">Water</h3>
              <p className="text-xs text-cyan-700/70 mt-1">Stay hydrated today</p>
            </div>
          </Link>

          <Link href="/routine">
            <div className="bg-luna-peach/30 hover:bg-luna-peach/50 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-orange-400">
                <ListChecks className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-orange-900">Routine</h3>
              <p className="text-xs text-orange-700/70 mt-1">Build daily habits</p>
            </div>
          </Link>
        </div>
      </main>
    </PageTransition>
  );
}
