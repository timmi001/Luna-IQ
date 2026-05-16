import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Bell, MessageCircleHeart, Wind, Droplets, ListChecks, Sparkles, X, Lightbulb, Heart, PlusCircle, ChevronRight } from "lucide-react";
import { MOODS, MoodFlower } from "@/components/MoodFlower";
import { motion, AnimatePresence } from "framer-motion";
import { storage } from "@/utils/storage";
import { getCycleDetails, getPhaseColor, CyclePhase } from "@/utils/cycle";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { BirthdayBanner } from "@/components/BirthdayBanner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const AVATARS = [
  { emoji: "🌸", bg: "#FFF0F9" },
  { emoji: "🦋", bg: "#F5F3FF" },
  { emoji: "", bg: "#EEF2FF", image: "/luna-icon.jpg" },
  { emoji: "🌺", bg: "#FFF7ED" },
  { emoji: "✨", bg: "#FEFCE8" },
  { emoji: "🌷", bg: "#FFF0F6" },
  { emoji: "💫", bg: "#EFF6FF" },
  { emoji: "🌻", bg: "#FEFCE8" },
];

function getGreeting(firstName?: string | null) {
  const h = new Date().getHours();
  const name = firstName ? `, ${firstName}` : "";
  if (h < 12) return `Good morning${name} ✨`;
  if (h < 18) return `Good afternoon${name} 🌸`;
  return `Good evening${name} 💜`;
}

// ── Animated cycle phase icons ────────────────────────────────────────────────

function BloodDrop({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.div
      className="absolute top-0"
      style={{ left: x }}
      initial={{ y: -14, opacity: 0, scaleY: 0.4 }}
      animate={{
        y:      [-14, -6, 32],
        opacity:[0,   1,   0],
        scaleY: [0.4, 1.3, 1],
      }}
      transition={{
        duration: 1.5,
        delay,
        repeat: Infinity,
        ease: "easeIn",
        times: [0, 0.25, 1],
      }}
    >
      <svg width="9" height="13" viewBox="0 0 9 13" fill="none">
        <path
          d="M4.5 0C4.5 0 9 7 9 9.5C9 11.43 6.99 13 4.5 13C2.01 13 0 11.43 0 9.5C0 7 4.5 0 4.5 0Z"
          fill="#DC2626"
        />
        <path
          d="M3 8.5C3 8.5 2.5 9.5 3.5 10"
          stroke="#FCA5A5"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    </motion.div>
  );
}

function MenstrualIcon() {
  return (
    <div className="relative w-10 h-10 overflow-hidden">
      <BloodDrop delay={0}    x={2}  />
      <BloodDrop delay={0.55} x={13} />
      <BloodDrop delay={1.1}  x={24} />
    </div>
  );
}

function FollicularIcon() {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <motion.div
        className="w-1.5 h-5 bg-emerald-500 rounded-full origin-bottom"
        animate={{ scaleY: [0.6, 1, 0.6], scaleX: [1, 1.15, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {[-1, 1].map((side) => (
        <motion.div
          key={side}
          className="absolute w-3 h-1.5 bg-emerald-400 rounded-full origin-center"
          style={{ rotate: side * 40, top: "30%", left: side === -1 ? "20%" : "55%" }}
          animate={{ scaleX: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, delay: 0.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function OvulationIcon() {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <motion.div
        className="w-5 h-5 rounded-full bg-orange-400"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      {[0, 45, 90, 135].map((deg) => (
        <motion.div
          key={deg}
          className="absolute w-1 h-3 bg-orange-300 rounded-full origin-bottom"
          style={{ rotate: deg, transformOrigin: "50% 100%", bottom: "50%", left: "50%", marginLeft: -2 }}
          animate={{ scaleY: [0.6, 1.1, 0.6], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, delay: deg / 400, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function LutealIcon() {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5], filter: ["blur(0px)", "blur(1px)", "blur(0px)"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M22 14c0 4.418-3.582 8-8 8a8 8 0 0 1-5.657-2.343A6 6 0 1 0 16.5 6.5 7.99 7.99 0 0 1 22 14z"
            fill="#A78BFA"
          />
        </svg>
      </motion.div>
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-violet-300"
          style={{ width: 3 + i, height: 3 + i, top: 4 + i * 5, right: 4 + i * 3 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

function UnknownCycleIcon() {
  return (
    <motion.div
      className="w-10 h-10 rounded-full overflow-hidden shadow-sm"
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2.5, repeat: Infinity }}
    >
      <img src="/luna-icon.jpg" alt="Luna" className="w-full h-full object-cover" />
    </motion.div>
  );
}

function CyclePhaseIcon({ phase }: { phase: string }) {
  if (phase === "Menstrual")  return <MenstrualIcon />;
  if (phase === "Follicular") return <FollicularIcon />;
  if (phase === "Ovulation")  return <OvulationIcon />;
  if (phase === "Luteal")     return <LutealIcon />;
  return <UnknownCycleIcon />;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Insight = {
  insight: string;
  pattern: string | null;
  suggestion: string;
  reassurance: string;
  isEncouragement?: boolean;
};


// ── Insight Modal ─────────────────────────────────────────────────────────────

function InsightModal({
  insight,
  onClose,
  onLogMood,
}: {
  insight: Insight;
  onClose: () => void;
  onLogMood: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          className="relative w-full max-w-[430px] rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl max-h-[88vh] overflow-y-auto"
          style={{ background: "linear-gradient(160deg, #F5E1E3 0%, #ECD5DC 100%)" }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
        >
          <div className="w-10 h-1 bg-muted/60 rounded-full mx-auto mb-5" />
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-luna-rose" />
              <span className="font-semibold text-sm uppercase tracking-wider text-foreground">Luna's Insight</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {insight.isEncouragement ? (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="text-5xl">💜</div>
              <p className="text-sm text-foreground text-center leading-relaxed font-medium">{insight.insight}</p>
              <p className="text-xs text-muted-foreground text-center">{insight.suggestion}</p>
              <p className="text-xs text-muted-foreground italic text-center">{insight.reassurance}</p>
              <button
                onClick={onLogMood}
                className="flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-2xl"
                style={{ background: "#B66A78", color: "#ffffff" }}
              >
                <PlusCircle className="w-4 h-4" />
                Log Today's Mood
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-foreground leading-relaxed">{insight.insight}</p>
              {insight.pattern && (
                <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(180,232,224,0.25)", border: "1px solid rgba(180,232,224,0.50)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Lightbulb className="w-3.5 h-3.5 text-luna-rose" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Pattern Detected</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed">{insight.pattern}</p>
                </div>
              )}
              <div className="bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-100">
                <div className="flex items-center gap-1.5 mb-1">
                  <Heart className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Gentle Suggestion</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{insight.suggestion}</p>
              </div>
              <p className="text-sm text-center text-muted-foreground italic">{insight.reassurance}</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Home page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, profile, refreshProfile } = useAuth();
  const userId = user?.id ?? "guest";

  const [insight, setInsight] = useState<Insight | null>(null);
  const [insightLoading, setInsightLoading] = useState(true);
  const [hasLogs, setHasLogs] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showBirthday, setShowBirthday] = useState(true);

  const latestMood = storage.getLatestMood();
  const cycleData = storage.getCycle();
  const { phase, currentDay } = getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength);

  const avatarIndex = profile?.avatar_index ?? 0;
  const avatar = AVATARS[avatarIndex] ?? AVATARS[0]!;

  const greeting = getGreeting(profile?.first_name);

  const moodEmoji = latestMood ? latestMood.mood.split(" ")[0] : "🤍";
  const moodLabel = latestMood ? latestMood.mood.split(" ")[1] : "Not logged";

  const loadInsight = useCallback(async () => {
    if (userId === "guest") return;
    const insightEndpoint = `${BASE}/api/luna/today-insight/${userId}`;
    console.log("[Luna Insight] Loading home insight — user:", userId, "endpoint:", insightEndpoint);
    setInsightLoading(true);
    try {
      const res = await fetch(insightEndpoint);
      if (res.ok) {
        const { insight: fetched, hasLogs: hl } = await res.json() as {
          insight: Insight | null;
          hasLogs: boolean;
        };
        setHasLogs(hl);
        if (fetched) {
          console.log("[Luna Insight] Home insight loaded for user:", userId);
          setInsight(fetched);
        }
      }
    } catch {
      // Non-critical
    } finally {
      setInsightLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadInsight(); }, [loadInsight]);

  // Re-fetch insight when the page becomes visible again (e.g. after mood logging)
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === "visible") loadInsight(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadInsight]);

  const insightPreview = insight?.insight
    ? insight.insight.split(". ")[0] + (insight.insight.includes(". ") ? "." : "")
    : null;

  const phaseColorClass = phase !== "Unknown" ? getPhaseColor(phase as CyclePhase) : "bg-gray-50 border-gray-200 text-gray-500";

  return (
    <>
      <PageTransition className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="pl-4 pr-4 pt-10 pb-4 sticky top-0 z-20 bg-background/80 backdrop-blur-md">
          {/* Big greeting — always renders instantly, falls back to generic if name not yet loaded */}
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {greeting}
          </h1>
          {console.log("[Luna Home] rendering greeting:", greeting) as unknown as null}

          {/* Sub-line with icons on the right */}
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-muted-foreground">
              {profile?.first_name
                ? `How are you feeling today, ${profile.first_name}?`
                : "Ready for a moment of mindfulness?"}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <button
                onClick={() => setLocation("/notifications")}
                className="relative w-8 h-8 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center active:scale-95 transition-transform"
              >
                <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-400" />
              </button>
              <button
                onClick={() => setLocation("/profile")}
                className="w-8 h-8 rounded-2xl overflow-hidden shadow-sm border border-card-border active:scale-95 transition-transform flex items-center justify-center"
                style={{ background: (avatar as any).image ? undefined : avatar.bg, fontSize: 18 }}
              >
                {(avatar as any).image
                  ? <img src={(avatar as any).image} alt="avatar" className="w-full h-full object-cover" />
                  : avatar.emoji}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 pt-2 pb-20 flex flex-col gap-4">

          {/* Birthday Banner */}
          {profile && showBirthday && (
            <BirthdayBanner
              profile={profile}
              onDismiss={() => {
                setShowBirthday(false);
                refreshProfile();
              }}
            />
          )}

          {/* Today's Check-in */}
          <div className="luna-glass rounded-3xl p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-luna-mint/20 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
            <h2 className="text-base font-semibold text-foreground mb-3">Today's Check-in</h2>

            <div className="flex gap-3">
              {/* Mood card */}
              <Link href="/mood" className="flex-1">
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  className="bg-gradient-to-br from-luna-blush/60 to-pink-100 rounded-2xl p-4 border border-luna-blush/60 cursor-pointer flex flex-col gap-2 min-h-[96px]"
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Mood</p>
                  {latestMood ? (
                    <div className="-ml-1 -mt-1">
                      <MoodFlower
                        mood={MOODS.find((m) => m.label === moodLabel) ?? MOODS[0]!}
                        isSelected={false}
                        size={56}
                        emojiSize={26}
                      />
                    </div>
                  ) : (
                    <span className="text-4xl leading-none">🤍</span>
                  )}
                  <p className="text-sm font-semibold text-foreground/80">{moodLabel}</p>
                </motion.div>
              </Link>

              {/* Cycle card */}
              <Link href="/cycle" className="flex-1">
                <motion.div
                  whileTap={{ scale: 0.96 }}
                  className={`rounded-2xl p-4 border cursor-pointer flex flex-col gap-1 min-h-[96px] ${phaseColorClass}`}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Cycle</p>
                  <div className="flex-1 flex items-center">
                    <CyclePhaseIcon phase={phase} />
                  </div>
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

          {/* Luna Insight Preview Card */}
          <motion.div
            className="luna-glass rounded-3xl p-5 shadow-sm"
            style={{ cursor: insight ? "pointer" : "default" }}
            whileTap={insight ? { scale: 0.98 } : {}}
            onClick={() => insight && setModalOpen(true)}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-luna-rose" />
              <h3 className="font-semibold uppercase tracking-wider text-xs text-foreground">Luna's Insight</h3>
            </div>

            {/* State 1: Loading / generating */}
            {insightLoading && (
              <div className="flex flex-col items-center gap-3 py-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-luna-mint"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-luna-rose"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 rounded-full bg-luna-gold"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Luna is preparing your insight…
                </p>
              </div>
            )}

            {/* State 2: No logs today */}
            {!insightLoading && !hasLogs && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Log how you're feeling today to receive your personalized Luna Insight 💜
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setLocation("/mood"); }}
                  className="self-start text-xs font-semibold px-4 py-2 rounded-2xl transition-all active:scale-95"
                  style={{ background: "#B66A78", color: "#ffffff" }}
                >
                  Log mood now →
                </button>
              </div>
            )}

            {/* State 3: Insight ready */}
            {!insightLoading && insight && (
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-foreground leading-relaxed flex-1 line-clamp-2">
                    {insightPreview}
                  </p>
                  <div className="flex items-center gap-0.5 text-luna-rose shrink-0 mt-0.5">
                    <span className="text-xs font-semibold">See more</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            )}

            {/* State 3b: Has logs but generation failed */}
            {!insightLoading && hasLogs && !insight && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Luna couldn't prepare your insight right now.</p>
                <button
                  onClick={(e) => { e.stopPropagation(); loadInsight(); }}
                  className="text-xs font-semibold text-luna-rose shrink-0 ml-2"
                >
                  Retry →
                </button>
              </div>
            )}
          </motion.div>

          <h3 className="text-lg font-medium px-1">My Space</h3>

          {/* Navigation Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/chat">
              <div className="rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, rgba(182,106,120,0.18) 0%, rgba(246,233,237,0.60) 100%)", border: "1px solid rgba(182,106,120,0.22)" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm mb-3"
                  style={{ background: "#B66A78", color: "white" }}>
                  <MessageCircleHeart className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground">Luna Chat</h3>
                <p className="text-xs text-muted-foreground mt-1">Talk to your AI companion</p>
              </div>
            </Link>

            <Link href="/breathe">
              <div className="bg-gradient-to-br from-sky-100 to-cyan-100 hover:from-sky-200 hover:to-cyan-200 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm border border-sky-200/60">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-sky-600">
                  <Wind className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-sky-900">Breathe</h3>
                <p className="text-xs text-sky-700/80 mt-1">4 · 4 · 4 calm reset</p>
              </div>
            </Link>

            <Link href="/water">
              <div className="bg-gradient-to-br from-teal-100 to-emerald-100 hover:from-teal-200 hover:to-emerald-200 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm border border-teal-200/60">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-teal-600">
                  <Droplets className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-teal-900">Water</h3>
                <p className="text-xs text-teal-700/80 mt-1">Stay hydrated today</p>
              </div>
            </Link>

            <Link href="/routine">
              <div className="bg-gradient-to-br from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 transition-colors rounded-3xl p-5 flex flex-col items-center justify-center text-center aspect-square cursor-pointer shadow-sm border border-orange-200/60">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3 text-orange-600">
                  <ListChecks className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-orange-900">Routine</h3>
                <p className="text-xs text-orange-700/80 mt-1">Your daily rituals</p>
              </div>
            </Link>
          </div>
        </main>
      </PageTransition>

      {modalOpen && insight && (
        <InsightModal
          insight={insight}
          onClose={() => setModalOpen(false)}
          onLogMood={() => { setModalOpen(false); setLocation("/mood"); }}
        />
      )}
    </>
  );
}
