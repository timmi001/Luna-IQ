import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { addPoints } from "@/lib/points";
import { storage } from "@/utils/storage";

const GOAL = 8;
const INTERVAL_HRS = 3;

function getNextReminder(): string {
  const now = new Date();
  const next = new Date(now.getTime() + INTERVAL_HRS * 60 * 60 * 1000);
  return next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Water() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [glasses, setGlasses] = useState(0);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [wave, setWave] = useState(false);

  useEffect(() => {
    setGlasses(storage.getWaterToday());
  }, []);

  const add = () => {
    if (glasses >= GOAL) return;
    const next = glasses + 1;
    setGlasses(next);
    storage.setWater(next);
    setWave(true);
    setTimeout(() => setWave(false), 700);
    if (next >= GOAL) {
      setShowCelebrate(true);
      setTimeout(() => setShowCelebrate(false), 2500);
    }
    // Award points for using this quick tool (once per day)
    if (user?.id) addPoints(user.id, "quick_tool").catch(() => {});
  };

  const remove = () => {
    if (glasses <= 0) return;
    const next = glasses - 1;
    setGlasses(next);
    storage.setWater(next);
  };

  const fillPct = Math.min((glasses / GOAL) * 100, 100);

  return (
    <PageTransition className="flex flex-col min-h-screen bg-gradient-to-b from-[#f0f9ff] to-[#e0f2fe]">
      <header className="px-6 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => setLocation("/")} className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Water Reminder</h1>
          <p className="text-xs text-muted-foreground">Next reminder at {getNextReminder()}</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center pb-20 px-6 pt-4">

        {/* Animated girl + glass */}
        <div className="relative flex flex-col items-center mb-6">
          <AnimatePresence>
            {showCelebrate && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-8 text-sm font-semibold text-sky-500"
              >
                🎉 Goal reached!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Girl SVG illustration */}
          <motion.div
            animate={wave ? { rotate: [0, -8, 8, -8, 0] } : { rotate: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[100px] leading-none select-none mb-2"
          >
            🧘‍♀️
          </motion.div>

          {/* Animated water glass */}
          <div className="relative w-16 h-24 rounded-b-2xl rounded-t-md border-2 border-sky-300 overflow-hidden bg-white shadow-md">
            <motion.div
              animate={{ height: `${fillPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute bottom-0 left-0 right-0"
              style={{ background: "linear-gradient(180deg, #7dd3fc 0%, #38bdf8 100%)" }}
            >
              {/* Wave effect */}
              <motion.div
                animate={{ x: [0, 8, 0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute -top-2 left-0 right-0 h-4 rounded-full opacity-60 bg-sky-200"
              />
            </motion.div>
            {/* Glass sheen */}
            <div className="absolute top-2 left-2 bottom-2 w-1.5 rounded-full bg-white/40" />
          </div>

          <p className="text-xs text-sky-500 font-medium mt-2">{glasses}/{GOAL} glasses</p>
        </div>

        {/* Big counter */}
        <motion.div
          key={glasses}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl font-bold text-sky-400 mb-1"
        >
          {glasses}
        </motion.div>
        <p className="text-sm text-muted-foreground mb-8">of {GOAL} glasses today</p>

        {/* Glass dots */}
        <div className="flex flex-wrap gap-3 justify-center mb-8 max-w-[260px]">
          {Array.from({ length: GOAL }).map((_, i) => (
            <motion.div
              key={i}
              initial={false}
              animate={{ scale: i < glasses ? 1 : 0.9 }}
              className="text-2xl select-none"
            >
              {i < glasses ? "🥤" : "🫙"}
            </motion.div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={remove}
            disabled={glasses <= 0}
            className="w-14 h-14 rounded-2xl bg-white border border-border/40 text-2xl shadow-sm disabled:opacity-30 active:scale-95 transition-transform"
          >
            −
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={add}
            disabled={glasses >= GOAL}
            className="flex-1 h-14 rounded-2xl text-white font-semibold text-sm shadow-md disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #38bdf8, #0ea5e9)" }}
          >
            + Add a glass
          </motion.button>
        </div>

        {/* Tip */}
        <div className="mt-8 w-full bg-white rounded-2xl p-4 border border-sky-100 shadow-sm">
          <p className="text-xs text-muted-foreground leading-relaxed text-center">
            💡 Drinking water every <b>{INTERVAL_HRS} hours</b> supports hormonal balance, skin health, and reduces bloating.
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
