import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { storage } from "@/utils/storage";
import { getCycleDetails, getPhaseMessage } from "@/utils/cycle";
import { CycleRing } from "@/components/CycleRing";
import { WaterIntakeCard } from "@/components/WaterIntakeCard";
import { BreatheCard } from "@/components/BreatheCard";
import { RoutineModal } from "@/components/RoutineModal";
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
  { icon: "💧", text: "Time to hydrate! You're 3 glasses behind.", time: "now" },
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
  const [showNotifs, setShowNotifs] = useState(false);
  const [selectedMood, setSelectedMood] = useState("");
  const [moodLabel, setMoodLabel] = useState("");

  const profile = storage.getProfile();
  const cycleData = storage.getCycle();
  const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);
  const latestMood = storage.getLatestMood();
  const avatar = AVATARS[profile.avatarIndex ?? 0] ?? AVATARS[0];

  useEffect(() => {
    if (latestMood) {
      const parts = latestMood.mood.split(" ");
      setSelectedMood(parts[0] ?? "");
      setMoodLabel(parts[1] ?? "");
    }
  }, []);

  const handleMoodSelect = (emoji: string, label: string) => {
    setSelectedMood(emoji);
    setMoodLabel(label);
    storage.addMood({
      date: new Date().toISOString(),
      mood: `${emoji} ${label}`,
      note: "",
    });
  };

  const insightText = phase !== "Unknown"
    ? getPhaseMessage(phase)
    : "Track your cycle to unlock personalized insights 💕";

  const greeting = getGreeting();
  const name = profile.nickname ? `, ${profile.nickname}` : "";

  return (
    <PageTransition className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-5 pt-12 pb-3 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-semibold text-foreground leading-tight">
            {greeting}{name} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug max-w-[210px]">
            {insightText}
          </p>
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

      <main className="flex-1 px-5 pb-28 flex flex-col gap-5">
        {/* Cycle Ring */}
        <div className="flex flex-col items-center mt-1">
          <CycleRing
            phase={phase}
            currentDay={currentDay}
            cycleLength={cycleData.cycleLength}
            selectedMood={selectedMood}
            onMoodSelect={handleMoodSelect}
          />
        </div>

        {/* Mood text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={moodLabel || "default"}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-center -mt-2"
          >
            {moodLabel ? (
              <p className="text-sm font-semibold text-purple-600">
                You're feeling {selectedMood} {moodLabel} today 💕
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                How are you feeling today?
                <span className="ml-1 text-xs text-purple-400">tap 🌙 to set</span>
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* My Space */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3 px-1">My Space</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <BreatheCard />
            <WaterIntakeCard />
          </div>
          <RoutineModal />
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
