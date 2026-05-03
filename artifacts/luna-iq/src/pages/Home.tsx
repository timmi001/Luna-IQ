import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, X, MessageCircleHeart, HeartPulse, CalendarHeart, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { storage } from "@/utils/storage";
import { getCycleDetails, getPhaseColor } from "@/utils/cycle";
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

const NOTIFICATIONS = [
  { icon: "💧", text: "Time to hydrate! Drink some water.", time: "now" },
  { icon: "🌸", text: "Log your mood to keep your streak alive.", time: "1h ago" },
  { icon: "📅", text: "Your Ovulation window starts in 2 days.", time: "3h ago" },
  { icon: "💕", text: "You've logged 5 moods this week! Keep it up.", time: "Yesterday" },
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
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const profile = storage.getProfile();
  const latestMood = storage.getLatestMood();
  const cycleData = storage.getCycle();
  const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);
  const avatar = AVATARS[profile.avatarIndex ?? 0] ?? AVATARS[0];
  const name = profile.nickname ? `, ${profile.nickname}` : "";

  return (
    <PageTransition className="flex flex-col min-h-screen">
      {/* Header with notification bell + profile icon */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            {greeting}{name} <Sparkles className="w-5 h-5 text-luna-peach" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Ready for a moment of mindfulness?</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button
            onClick={() => setShowNotifs(true)}
            className="relative w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center active:scale-95 transition-transform"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-400" />
          </button>

          {/* Profile avatar */}
          <button
            onClick={() => setLocation("/profile")}
            className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm border border-card-border active:scale-95 transition-transform"
            style={{ background: avatar.bg, fontSize: 20 }}
          >
            {avatar.emoji}
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 pt-4 pb-28 flex flex-col gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-card-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-luna-lavender/30 rounded-full blur-2xl -mr-10 -mt-10" />
          <h2 className="text-lg font-medium mb-4 text-foreground">Today's Check-in</h2>

          <div className="flex gap-4">
            <div className="flex-1 bg-luna-blush/20 rounded-2xl p-4 border border-luna-blush/30">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Mood</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{latestMood ? latestMood.mood.split(" ")[0] : "🤍"}</span>
                <span className="text-sm font-medium">{latestMood ? latestMood.mood.split(" ")[1] : "Not logged"}</span>
              </div>
            </div>

            <div className={`flex-1 rounded-2xl p-4 border ${phase !== "Unknown" ? getPhaseColor(phase).replace("text-", "border-").replace("bg-", "bg-opacity-20 bg-") : "bg-gray-50 border-gray-100"}`}>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Cycle</p>
              <div className="flex flex-col">
                <span className="text-sm font-semibold truncate">{phase !== "Unknown" ? phase : "Not logged"}</span>
                <span className="text-xs opacity-80">{phase !== "Unknown" ? `Day ${currentDay}` : "--"}</span>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-medium mt-2 px-1">Your Spaces</h3>

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

          <Link href="/mood">
            <div className="bg-luna-peach/40 hover:bg-luna-peach/60 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-orange-500">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-orange-900">Mood</h3>
              <p className="text-xs text-orange-700/70 mt-1">Track how you feel</p>
            </div>
          </Link>

          <Link href="/cycle">
            <div className="bg-rose-100/60 hover:bg-rose-100/80 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-rose-500">
                <CalendarHeart className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-rose-900">Cycle</h3>
              <p className="text-xs text-rose-700/70 mt-1">Understand your rhythm</p>
            </div>
          </Link>

          <Link href="/insights">
            <div className="bg-luna-mint/40 hover:bg-luna-mint/60 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-emerald-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-emerald-900">Insights</h3>
              <p className="text-xs text-emerald-700/70 mt-1">Discover patterns</p>
            </div>
          </Link>
        </div>
      </main>

      {/* Notification panel */}
      <AnimatePresence>
        {showNotifs && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-30"
              onClick={() => setShowNotifs(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ duration: 0.22 }}
              className="fixed top-24 right-4 z-40 w-72 bg-white rounded-3xl shadow-lg border border-card-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <button onClick={() => setShowNotifs(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-muted/40">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <div className="flex flex-col">
                {NOTIFICATIONS.map((n, i) => (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i < NOTIFICATIONS.length - 1 ? "border-b border-border/30" : ""}`}>
                    <span className="text-lg mt-0.5">{n.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs text-foreground leading-snug">{n.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
