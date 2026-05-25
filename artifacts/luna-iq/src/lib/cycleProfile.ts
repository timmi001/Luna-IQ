import { supabase } from "@/lib/supabase";
import type { CycleData } from "@/utils/storage";

export const DEFAULT_CYCLE: CycleData = {
  lastPeriodStart: null,
  cycleLength: 28,
};

type ProfileCycleRow = {
  last_period_date: string | null;
  cycle_length: number | null;
};

/** Load cycle anchor from Supabase profiles (canonical store). */
export async function fetchCycleFromProfile(
  userId: string,
): Promise<CycleData | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("last_period_date, cycle_length")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[Luna Cycle] profile fetch failed:", error.code, error.message);
    return null;
  }

  if (!data) return null;

  const row = data as ProfileCycleRow;
  return {
    lastPeriodStart: row.last_period_date ?? null,
    cycleLength: row.cycle_length ?? DEFAULT_CYCLE.cycleLength,
  };
}

/** Persist cycle anchor to Supabase (only last period date + length; never phase/countdown). */
export async function saveCycleToProfile(
  userId: string,
  cycle: CycleData,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({
      last_period_date: cycle.lastPeriodStart,
      cycle_length: cycle.cycleLength,
    })
    .eq("id", userId);

  if (error) {
    console.warn("[Luna Cycle] profile save failed:", error.code, error.message);
    return false;
  }

  return true;
}
