import { supabase } from "./supabase";

export type ActionType =
  | "mood_checkin"
  | "cycle_log"
  | "private_space"
  | "quick_tool"
  | "streak_bonus";

const POINT_VALUES: Record<string, number> = {
  mood_checkin: 3,
  cycle_log: 5,
  private_space: 4,
  quick_tool: 2,
};

const STREAK_MILESTONES: Record<number, number> = {
  3: 10,
  7: 20,
  14: 30,
};

// ── Core: award points with daily cooldown ─────────────────────────────────────
export async function addPoints(
  userId: string,
  action: ActionType,
  override?: number,
): Promise<{ awarded: boolean; points: number; bonus: number }> {
  const points = override ?? POINT_VALUES[action] ?? 2;
  const today = new Date().toISOString().split("T")[0];

  // Cooldown: one reward per action per calendar day
  const { data: existing } = await supabase
    .from("luna_points")
    .select("id")
    .eq("user_id", userId)
    .eq("action_type", action)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .maybeSingle();

  if (existing) return { awarded: false, points: 0, bonus: 0 };

  // Record transaction
  await supabase.from("luna_points").insert({
    user_id: userId,
    action_type: action,
    points_earned: points,
  });

  // Update wallet + streak
  const bonus = await _updateWallet(userId, points);

  return { awarded: true, points, bonus };
}

// ── Internal: upsert wallet and manage streak ──────────────────────────────────
async function _updateWallet(userId: string, pointsToAdd: number): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const { data: wallet } = await supabase
    .from("user_wallet")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let newStreak = 1;
  let longestStreak = wallet?.longest_streak ?? 0;
  let bonusPoints = 0;
  let alreadyTodayStreak = false;

  if (wallet) {
    const lastDate = wallet.last_activity_date as string | null;
    if (lastDate === today) {
      newStreak = wallet.current_streak;
      alreadyTodayStreak = true;
    } else if (lastDate === yesterdayStr) {
      newStreak = wallet.current_streak + 1;
      const milestone = STREAK_MILESTONES[newStreak];
      if (milestone) {
        bonusPoints = milestone;
        // Record bonus transaction
        await supabase.from("luna_points").insert({
          user_id: userId,
          action_type: "streak_bonus",
          points_earned: milestone,
        });
      }
    }
    // else: gap — streak resets to 1
  }

  if (newStreak > longestStreak) longestStreak = newStreak;
  const totalPoints = (wallet?.total_points ?? 0) + pointsToAdd + bonusPoints;

  if (wallet) {
    await supabase
      .from("user_wallet")
      .update({
        total_points: totalPoints,
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_activity_date: alreadyTodayStreak ? wallet.last_activity_date : today,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } else {
    await supabase.from("user_wallet").insert({
      user_id: userId,
      total_points: totalPoints,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
    });
  }

  return bonusPoints;
}

// ── Public helpers ─────────────────────────────────────────────────────────────
export async function getUserWallet(userId: string) {
  const { data } = await supabase
    .from("user_wallet")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as {
    total_points: number;
    current_streak: number;
    longest_streak: number;
    last_activity_date: string | null;
  } | null;
}

export async function getPointHistory(userId: string, limit = 30) {
  const { data } = await supabase
    .from("luna_points")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as {
    id: string;
    action_type: string;
    points_earned: number;
    created_at: string;
  }[];
}

export async function getRewards() {
  const { data } = await supabase
    .from("rewards_catalog")
    .select("*")
    .eq("active", true)
    .order("points_required");
  return data ?? null;
}

// ── Display helpers ────────────────────────────────────────────────────────────
export function actionLabel(type: string): string {
  const labels: Record<string, string> = {
    mood_checkin: "Mood check-in",
    cycle_log: "Cycle logged",
    private_space: "Journal entry",
    quick_tool: "Quick tool used",
    streak_bonus: "Streak milestone bonus",
  };
  return labels[type] ?? type;
}

export function actionEmoji(type: string): string {
  const emojis: Record<string, string> = {
    mood_checkin: "🌸",
    cycle_log: "📅",
    private_space: "📝",
    quick_tool: "✨",
    streak_bonus: "🔥",
  };
  return emojis[type] ?? "💜";
}
