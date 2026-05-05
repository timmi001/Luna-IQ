import { useLocation } from "wouter";
import { ArrowLeft, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";

const NOTIFICATIONS = [
  { icon: "💧", title: "Hydration reminder", text: "Time to hydrate! Drink some water.", time: "Just now", color: "#e0f2fe" },
  { icon: "🌸", title: "Mood streak", text: "Log your mood to keep your streak alive.", time: "1h ago", color: "#fdf4ff" },
  { icon: "📅", title: "Fertile window", text: "Your Ovulation window starts in 2 days.", time: "3h ago", color: "#fff7ed" },
  { icon: "💕", title: "Weekly win", text: "You've logged 5 moods this week! Keep it up.", time: "Yesterday", color: "#fdf2f8" },
  { icon: "🌙", title: "Cycle update", text: "You're in your Luteal phase. Slow down and restore.", time: "2 days ago", color: "#f5f3ff" },
  { icon: "💊", title: "Supplement reminder", text: "Remember to take your evening vitamins.", time: "2 days ago", color: "#f0fdf4" },
];

export default function Notifications() {
  const [, setLocation] = useLocation();

  return (
    <PageTransition className="flex flex-col min-h-screen bg-[#faf8ff]">
      <header className="px-6 pt-12 pb-4 flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <button
          onClick={() => setLocation("/")}
          className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
          <p className="text-xs text-muted-foreground">{NOTIFICATIONS.length} updates for you</p>
        </div>
      </header>

      <main className="flex-1 px-6 pb-28 flex flex-col gap-3 pt-2">
        {NOTIFICATIONS.map((n, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-4 bg-white rounded-2xl p-4 border border-card-border shadow-sm"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: n.color }}>
              {n.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.text}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">{n.time}</p>
            </div>
            {i === 0 && (
              <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0 mt-1.5" />
            )}
          </motion.div>
        ))}
      </main>
    </PageTransition>
  );
}
