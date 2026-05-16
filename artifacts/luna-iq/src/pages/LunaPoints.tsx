import { useEffect, useState } from "react";
import { ChevronLeft, Lock, Flame, Star } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserWallet,
  getPointHistory,
  getRewards,
  actionLabel,
  actionEmoji,
} from "@/lib/points";

// ── Types ──────────────────────────────────────────────────────────────────────
type Wallet = {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

type PointRecord = {
  id: string;
  action_type: string;
  points_earned: number;
  created_at: string;
};

type Reward = {
  id: string;
  reward_name: string;
  reward_description: string;
  points_required: number;
  reward_type: string;
};

// ── Fallback rewards (shown even before Supabase table exists) ─────────────────
const FALLBACK_REWARDS: Reward[] = [
  { id: "1", reward_name: "Free Luna Premium Week", reward_description: "Unlock all premium features for 7 full days.", points_required: 150, reward_type: "premium" },
  { id: "2", reward_name: "₦500 Pad Discount", reward_description: "₦500 off premium menstrual pads at select stores.", points_required: 200, reward_type: "discount" },
  { id: "3", reward_name: "Period Care Starter Kit", reward_description: "Everything you need for a comfortable period week.", points_required: 350, reward_type: "kit" },
  { id: "4", reward_name: "Self-Care Bundle", reward_description: "A handpicked collection of feminine wellness products.", points_required: 400, reward_type: "bundle" },
  { id: "5", reward_name: "Wellness Care Package", reward_description: "A curated package of self-care essentials.", points_required: 500, reward_type: "package" },
  { id: "6", reward_name: "Feminine Care Discounts", reward_description: "20% off feminine hygiene products from our partners.", points_required: 100, reward_type: "discount" },
];

const REWARD_TYPE_EMOJI: Record<string, string> = {
  premium: "👑",
  discount: "🏷️",
  kit: "🌸",
  bundle: "💝",
  package: "🎁",
};

const HOW_TO_EARN = [
  { action: "Mood check-in",   points: 3, emoji: "🌸", desc: "Log your mood daily" },
  { action: "Cycle log",       points: 5, emoji: "📅", desc: "Track your cycle" },
  { action: "Journal entry",   points: 4, emoji: "📝", desc: "Write in Private Space" },
  { action: "Quick tool",      points: 2, emoji: "✨", desc: "Use breathe, water, or routine" },
];

const STREAK_MILESTONES = [
  { days: 3,  bonus: 10, label: "3-day streak" },
  { days: 7,  bonus: 20, label: "7-day streak" },
  { days: 14, bonus: 30, label: "14-day streak" },
];

// ── Wallet card ────────────────────────────────────────────────────────────────
function WalletCard({ wallet }: { wallet: Wallet | null }) {
  const points = wallet?.total_points ?? 0;
  const streak = wallet?.current_streak ?? 0;

  return (
    <div
      className="rounded-3xl p-6 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)" }}
    >
      {/* Background orbs */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full opacity-20 bg-white" />
      <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full opacity-10 bg-white" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full overflow-hidden shadow-sm flex-shrink-0">
            <img src="/luna-icon.jpg" alt="Luna" className="w-full h-full object-cover" />
          </div>
          <p className="text-white/80 text-sm font-medium">Luna Points</p>
        </div>

        <motion.p
          key={points}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl font-bold text-white mb-1"
        >
          {points}
        </motion.p>
        <p className="text-white/60 text-xs mb-5">points earned</p>

        <div className="flex items-center gap-4">
          {streak > 0 && (
            <div className="flex items-center gap-2 bg-white/15 rounded-2xl px-3 py-2">
              <Flame className="w-4 h-4 text-orange-300" />
              <div>
                <p className="text-white text-xs font-semibold">{streak}-day streak</p>
                <p className="text-white/60 text-[10px]">Keep it going 🔥</p>
              </div>
            </div>
          )}
          {wallet?.longest_streak && wallet.longest_streak > 0 && (
            <div className="flex items-center gap-2 bg-white/15 rounded-2xl px-3 py-2">
              <Star className="w-4 h-4 text-yellow-300" />
              <div>
                <p className="text-white text-xs font-semibold">Best: {wallet.longest_streak}</p>
                <p className="text-white/60 text-[10px]">days in a row</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── How to earn row ────────────────────────────────────────────────────────────
function EarnRow({ emoji, action, points, desc }: { emoji: string; action: string; points: number; desc: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0">
      <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-lg flex-shrink-0">
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{action}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="flex items-center gap-1 bg-purple-50 rounded-xl px-2.5 py-1 flex-shrink-0">
        <span className="text-[11px] font-bold text-purple-600">+{points}</span>
        <span className="text-[10px] text-purple-400">pts</span>
      </div>
    </div>
  );
}

// ── Point history row ──────────────────────────────────────────────────────────
function HistoryRow({ record }: { record: PointRecord }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/30 last:border-0">
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center text-base flex-shrink-0">
        {actionEmoji(record.action_type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{actionLabel(record.action_type)}</p>
        <p className="text-[11px] text-muted-foreground">
          {format(new Date(record.created_at), "MMM d, h:mm a")}
        </p>
      </div>
      <span className="text-sm font-semibold text-purple-600 flex-shrink-0">+{record.points_earned}</span>
    </div>
  );
}

// ── Reward card ────────────────────────────────────────────────────────────────
function RewardCard({
  reward,
  userPoints,
  onClick,
}: {
  reward: Reward;
  userPoints: number;
  onClick: () => void;
}) {
  const canAfford = userPoints >= reward.points_required;
  return (
    <button
      onClick={onClick}
      className="w-full rounded-3xl p-4 border flex items-center gap-4 text-left active:scale-[0.98] transition-all"
      style={{
        background: canAfford ? "linear-gradient(135deg, #FDF2F8, #F5F3FF)" : "#FAFAFA",
        borderColor: canAfford ? "#E9D5FF" : "#E5E7EB",
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: canAfford ? "linear-gradient(135deg, #EDE9FE, #FCE7F3)" : "#F3F4F6" }}
      >
        {REWARD_TYPE_EMOJI[reward.reward_type] ?? "🎁"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{reward.reward_name}</p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-1">{reward.reward_description}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-[10px] font-semibold text-purple-500">{reward.points_required} pts needed</span>
        </div>
      </div>
      <div
        className="flex-shrink-0 flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-semibold border"
        style={{
          background: canAfford ? "linear-gradient(135deg, #C4B5FD, #F9A8D4)" : "#F3F4F6",
          color: canAfford ? "white" : "#9CA3AF",
          borderColor: canAfford ? "transparent" : "#E5E7EB",
        }}
      >
        {!canAfford && <Lock className="w-3 h-3" />}
        {canAfford ? "Redeem" : "Locked"}
      </div>
    </button>
  );
}

// ── Reward detail sheet ─────────────────────────────────────────────────────────
function RewardDetailSheet({
  reward,
  userPoints,
  onClose,
}: {
  reward: Reward;
  userPoints: number;
  onClose: () => void;
}) {
  const canAfford = userPoints >= reward.points_required;
  const remaining = Math.max(reward.points_required - userPoints, 0);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex flex-col justify-end items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-[430px] rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl"
          style={{ background: "linear-gradient(160deg, #F5F3FF 0%, #FDF2F8 100%)" }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
        >
          <div className="w-10 h-1 bg-muted/50 rounded-full mx-auto mb-5" />

          {/* Emoji + title */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-md"
              style={{ background: canAfford ? "linear-gradient(135deg, #EDE9FE, #FCE7F3)" : "#F3F4F6" }}
            >
              {REWARD_TYPE_EMOJI[reward.reward_type] ?? "🎁"}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{reward.reward_name}</p>
              <p className="text-xs text-muted-foreground mt-1">{reward.reward_description}</p>
            </div>
          </div>

          {/* Points info */}
          <div
            className="rounded-2xl p-4 mb-4"
            style={{ background: canAfford ? "linear-gradient(135deg, #EDE9FE, #FCE7F3)" : "#F3F4F6", border: "1px solid #E9D5FF" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Points required</p>
              <p className="text-sm font-bold text-purple-600">{reward.points_required} pts</p>
            </div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Your balance</p>
              <p className="text-sm font-semibold text-foreground">{userPoints} pts</p>
            </div>
            {/* Progress bar */}
            <div className="h-2 rounded-full bg-white/60 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #C4B5FD, #F9A8D4)" }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((userPoints / reward.points_required) * 100, 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            {!canAfford && (
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                {remaining} more pts to unlock this reward
              </p>
            )}
          </div>

          {/* Status */}
          <div className="rounded-2xl px-4 py-3 mb-5 text-center" style={{ background: "rgba(255,255,255,0.60)" }}>
            <p className="text-sm font-medium text-purple-700">
              {canAfford
                ? "🎉 You've earned this reward! Redemption coming soon."
                : "⏳ Coming soon — keep earning points to unlock this!"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white shadow-md"
            style={{ background: "linear-gradient(135deg, #C4B5FD, #F9A8D4)" }}
          >
            Got it
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function LunaPoints() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [history, setHistory] = useState<PointRecord[]>([]);
  const [rewards, setRewards] = useState<Reward[]>(FALLBACK_REWARDS);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"earn" | "history" | "rewards">("earn");
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      getUserWallet(user.id),
      getPointHistory(user.id, 30),
      getRewards(),
    ]).then(([w, h, r]) => {
      setWallet(w);
      setHistory(h);
      if (r && r.length > 0) setRewards(r as Reward[]);
      setLoading(false);
    });
  }, [user?.id]);

  const SECTIONS = [
    { key: "earn",    label: "How to earn" },
    { key: "history", label: "My activity" },
    { key: "rewards", label: "Rewards" },
  ] as const;

  return (
    <PageTransition className="flex flex-col min-h-screen pb-10">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex items-center gap-3 sticky top-0 z-10 bg-background/80 backdrop-blur-md">
        <button
          onClick={() => setLocation("/profile")}
          className="w-9 h-9 rounded-2xl bg-white shadow-sm border border-card-border flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Luna Points</h1>
          <p className="text-xs text-muted-foreground">Your wellness rewards</p>
        </div>
      </header>

      <main className="flex-1 px-5 flex flex-col gap-5">
        {/* Wallet card */}
        <WalletCard wallet={wallet} />

        {/* Motivational micro-copy */}
        {!loading && (wallet?.total_points ?? 0) === 0 && (
          <div className="bg-white rounded-2xl px-4 py-3 border border-card-border text-center">
            <p className="text-sm text-muted-foreground">
              Start earning by logging your mood, cycle, or writing in your Private Space 💜
            </p>
          </div>
        )}

        {/* Streak milestones */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Streak milestones</p>
          <div className="flex gap-2">
            {STREAK_MILESTONES.map((m) => {
              const reached = (wallet?.longest_streak ?? 0) >= m.days;
              return (
                <div
                  key={m.days}
                  className="flex-1 rounded-2xl p-3 text-center"
                  style={{
                    background: reached ? "linear-gradient(135deg, #EDE9FE, #FCE7F3)" : "#F9FAFB",
                    border: `1px solid ${reached ? "#DDD6FE" : "#E5E7EB"}`,
                  }}
                >
                  <p className="text-lg mb-1">{reached ? "🔥" : "🌙"}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground">{m.label}</p>
                  <p className={`text-xs font-bold mt-0.5 ${reached ? "text-purple-600" : "text-muted-foreground"}`}>+{m.bonus} pts</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-card-border p-1 flex">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className="flex-1 text-[11px] font-semibold rounded-xl py-2 transition-all"
              style={{
                background: activeSection === s.key ? "linear-gradient(135deg, #EDE9FE, #FCE7F3)" : "transparent",
                color: activeSection === s.key ? "#7C3AED" : "#9CA3AF",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-3xl p-5 shadow-sm border border-card-border"
          >
            {activeSection === "earn" && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Ways to earn</p>
                <p className="text-[11px] text-muted-foreground mb-3">One reward per action per day</p>
                {HOW_TO_EARN.map((h) => (
                  <EarnRow key={h.action} {...h} />
                ))}
              </div>
            )}

            {activeSection === "history" && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Recent activity</p>
                {loading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
                ) : history.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center gap-2">
                    <span className="text-3xl">🌱</span>
                    <p className="text-sm text-muted-foreground">No activity yet — start earning today!</p>
                  </div>
                ) : (
                  history.map((r) => <HistoryRow key={r.id} record={r} />)
                )}
              </div>
            )}

            {activeSection === "rewards" && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Future rewards</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Coming soon — keep earning 💜</p>
                </div>
                {rewards.map((r) => (
                  <RewardCard
                    key={r.id}
                    reward={r}
                    userPoints={wallet?.total_points ?? 0}
                    onClick={() => setSelectedReward(r)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Reward detail sheet */}
        {selectedReward && (
          <RewardDetailSheet
            reward={selectedReward}
            userPoints={wallet?.total_points ?? 0}
            onClose={() => setSelectedReward(null)}
          />
        )}

        {/* Wellness note */}
        <div
          className="rounded-2xl px-4 py-3 text-center"
          style={{ background: "linear-gradient(135deg, #F5F3FF, #FFF0F9)" }}
        >
          <p className="text-xs text-purple-500 font-medium">
            Consistency deserves care 🌸<br />
            <span className="text-muted-foreground font-normal">You're showing up for yourself today 💜</span>
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
