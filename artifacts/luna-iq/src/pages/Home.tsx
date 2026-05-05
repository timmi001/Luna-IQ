import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Bell, X, MessageCircleHeart, Wind, Droplets, ListChecks, Sparkles, SendHorizonal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

function getTodaySymptomNote(): string {
  try {
    const raw = localStorage.getItem("luna_symptoms");
    if (!raw) return "";
    const entries = JSON.parse(raw) as { date: string; note: string }[];
    const today = new Date().toISOString().split("T")[0];
    return entries.find((e) => e.date === today)?.note ?? "";
  } catch {
    return "";
  }
}

function saveSymptomNote(note: string) {
  try {
    const raw = localStorage.getItem("luna_symptoms");
    const entries: { date: string; note: string }[] = raw ? JSON.parse(raw) : [];
    const today = new Date().toISOString().split("T")[0];
    const idx = entries.findIndex((e) => e.date === today);
    if (idx >= 0) entries[idx].note = note;
    else entries.unshift({ date: today, note });
    localStorage.setItem("luna_symptoms", JSON.stringify(entries));
  } catch {}
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [greeting, setGreeting] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [symptomInput, setSymptomInput] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGreeting(getGreeting());
    const note = getTodaySymptomNote();
    setSavedNote(note);
  }, []);

  const profile = storage.getProfile();
  const latestMood = storage.getLatestMood();
  const cycleData = storage.getCycle();
  const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);
  const avatar = AVATARS[profile.avatarIndex ?? 0] ?? AVATARS[0];
  const name = profile.nickname ? `, ${profile.nickname}` : "";

  const handleSaveSymptom = () => {
    const trimmed = symptomInput.trim();
    if (!trimmed) return;
    const updated = savedNote ? `${savedNote}, ${trimmed}` : trimmed;
    setSavedNote(updated);
    saveSymptomNote(updated);
    setSymptomInput("");
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1600);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSaveSymptom();
  };

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
            onClick={() => setShowNotifs(true)}
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

        {/* Today's Check-in — includes Mood, Cycle, and Symptoms */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-card-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-luna-lavender/30 rounded-full blur-2xl -mr-10 -mt-10" />
          <h2 className="text-lg font-medium mb-4 text-foreground">Today's Check-in</h2>

          {/* Mood + Cycle row */}
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

          {/* Divider */}
          <div className="border-t border-border/30 mt-4 mb-3" />

          {/* Symptoms section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Symptoms</p>
              <AnimatePresence>
                {showSaved && (
                  <motion.span
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] text-emerald-500 font-semibold"
                  >
                    ✓ Logged
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Saved note display */}
            {savedNote && (
              <p className="text-xs text-foreground/80 mb-2 leading-relaxed bg-luna-blush/10 rounded-xl px-3 py-2 border border-luna-blush/20">
                {savedNote}
              </p>
            )}

            {/* Text input */}
            <div className="flex items-center gap-2 bg-muted/30 rounded-2xl px-3 py-2 border border-border/30 focus-within:border-primary/40 transition-colors">
              <input
                ref={inputRef}
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={savedNote ? "Add more symptoms…" : "e.g. cramps, headache, fatigue…"}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={handleSaveSymptom}
                disabled={!symptomInput.trim()}
                className="w-7 h-7 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 active:scale-90"
                style={{ background: symptomInput.trim() ? "linear-gradient(135deg,#f9a8d4,#c4b5fd)" : "transparent" }}
              >
                <SendHorizonal className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Body Wisdom Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-card-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold uppercase tracking-wider text-xs text-emerald-800">Body Wisdom</h3>
          </div>
          {phase !== "Unknown" ? (
            <div className="flex flex-col gap-3">
              <div className={`inline-flex items-center self-start px-3 py-1 rounded-full text-xs font-semibold ${getPhaseColor(phase as CyclePhase).replace("bg-", "bg-opacity-30 bg-")}`}>
                {phase} · Day {currentDay}
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {getPhaseMessage(phase as CyclePhase)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Track your cycle to receive personalized body insights.
            </p>
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
