// ── Per-user storage ──────────────────────────────────────────────────────────
//
// All data is keyed by the authenticated user's ID so each account on the
// same device has a completely isolated wellness space.
//
// Call `setStorageUser(userId)` when the user logs in or switches accounts.
// Call `setStorageUser(null)` on logout.
//
// `migrateGlobalData(userId)` runs once per user and copies any existing
// legacy (pre-isolation) data from bare global keys into the user-scoped keys
// so prior entries are not lost on first upgrade.

let _userId: string | null = null;

export function setStorageUser(userId: string | null): void {
  _userId = userId;
  console.log("[Luna Storage] Current user:", userId ?? "(none)");
}

/** Returns a user-scoped key. Falls back to the bare base key for guests. */
function k(base: string): string {
  if (_userId) return `${base}_${_userId}`;
  return base;
}

const MIGRATABLE_BASES = [
  "luna_moods",
  "luna_cycle",
  "luna_profile",
  "luna_water",
  "luna_symptoms",
  "luna_routine",
];

/**
 * Copies legacy global-key data into the user-scoped keys.
 * No-op if already run for this user (tracked by `luna_migrated_${userId}`).
 */
export function migrateGlobalData(userId: string): void {
  const migrationKey = `luna_migrated_${userId}`;
  if (localStorage.getItem(migrationKey)) return;
  for (const base of MIGRATABLE_BASES) {
    const globalValue = localStorage.getItem(base);
    const userKey = `${base}_${userId}`;
    if (globalValue && !localStorage.getItem(userKey)) {
      localStorage.setItem(userKey, globalValue);
      console.log(`[Luna Storage] Migrated ${base} → ${userKey}`);
    }
  }
  localStorage.setItem(migrationKey, "1");
  console.log(`[Luna Storage] Migration complete for user: ${userId}`);
}

// ── Key bases ─────────────────────────────────────────────────────────────────
const BASE_MOODS    = "luna_moods";
const BASE_CYCLE    = "luna_cycle";
const BASE_PROFILE  = "luna_profile";
const BASE_WATER    = "luna_water";
const BASE_SYMPTOMS = "luna_symptoms";
const BASE_ROUTINE  = "luna_routine";

// ── Types ─────────────────────────────────────────────────────────────────────
export type MoodEntry = { id: string; date: string; mood: string; note: string };
export type CycleData = { lastPeriodStart: string | null; cycleLength: number };
export type ProfileData = { nickname: string; avatarIndex: number };
export type WaterData = { date: string; glasses: number };
export type SymptomEntry = { date: string; note: string };
export type RoutineItem = {
  id: string;
  label: string;
  emoji: string;
  done: boolean;
  time?: string;
};

// ── Unified storage object ────────────────────────────────────────────────────
export const storage = {

  // ── Moods ──────────────────────────────────────────────────────────────────

  getMoods: (): MoodEntry[] => {
    try {
      const key = k(BASE_MOODS);
      console.log("[Luna Storage] Using storage key:", key);
      const data = localStorage.getItem(key);
      return data ? (JSON.parse(data) as MoodEntry[]) : [];
    } catch { return []; }
  },

  addMood: (mood: Omit<MoodEntry, "id">): MoodEntry => {
    const moods = storage.getMoods();
    const newMood: MoodEntry = { ...mood, id: crypto.randomUUID() };
    localStorage.setItem(k(BASE_MOODS), JSON.stringify([newMood, ...moods]));
    return newMood;
  },

  getLatestMood: (): MoodEntry | null => {
    const moods = storage.getMoods();
    return moods.length > 0 ? (moods[0] ?? null) : null;
  },

  getMoodStreak: (): number => {
    const moods = storage.getMoods();
    if (moods.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < moods.length; i++) {
      const moodDate = new Date(moods[i]!.date);
      moodDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round(
        Math.abs(today.getTime() - moodDate.getTime()) / 86400000,
      );
      if (i === 0 && diffDays > 1) return 0;
      if (i > 0) {
        const prev = new Date(moods[i - 1]!.date);
        prev.setHours(0, 0, 0, 0);
        const d = Math.round(
          Math.abs(prev.getTime() - moodDate.getTime()) / 86400000,
        );
        if (d > 1) break;
      }
      streak++;
    }
    return streak;
  },

  // ── Cycle ──────────────────────────────────────────────────────────────────

  getCycle: (): CycleData => {
    try {
      const key = k(BASE_CYCLE);
      console.log("[Luna Storage] Using storage key:", key);
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data) as CycleData;
    } catch {}
    return { lastPeriodStart: null, cycleLength: 28 };
  },

  saveCycle: (data: CycleData): void => {
    localStorage.setItem(k(BASE_CYCLE), JSON.stringify(data));
  },

  // ── Profile ────────────────────────────────────────────────────────────────

  getProfile: (): ProfileData => {
    try {
      const data = localStorage.getItem(k(BASE_PROFILE));
      if (data) return JSON.parse(data) as ProfileData;
    } catch {}
    return { nickname: "", avatarIndex: 0 };
  },

  saveProfile: (data: ProfileData): void => {
    localStorage.setItem(k(BASE_PROFILE), JSON.stringify(data));
  },

  // ── Water ──────────────────────────────────────────────────────────────────

  getWaterToday: (): number => {
    try {
      const data = localStorage.getItem(k(BASE_WATER));
      if (!data) return 0;
      const parsed = JSON.parse(data) as WaterData;
      const today = new Date().toISOString().split("T")[0]!;
      return parsed.date === today ? parsed.glasses : 0;
    } catch { return 0; }
  },

  /** Set water count to a specific number (used by the standalone Water page). */
  setWater: (n: number): void => {
    const today = new Date().toISOString().split("T")[0]!;
    localStorage.setItem(k(BASE_WATER), JSON.stringify({ date: today, glasses: n }));
  },

  /** Increment water count by 1, capped at 8. Returns the new count. */
  logWater: (): number => {
    const current = storage.getWaterToday();
    const next = Math.min(current + 1, 8);
    storage.setWater(next);
    return next;
  },

  resetWater: (): void => {
    storage.setWater(0);
  },

  // ── Symptoms ───────────────────────────────────────────────────────────────

  /**
   * Returns the raw comma-string symptom note for a given date,
   * e.g. "cramps, bloating". Used by the Cycle page textarea.
   */
  getSymptomsNote: (date: string): string => {
    try {
      const data = localStorage.getItem(k(BASE_SYMPTOMS));
      if (!data) return "";
      const entries = JSON.parse(data) as SymptomEntry[];
      return entries.find((e) => e.date === date)?.note ?? "";
    } catch { return ""; }
  },

  /** Saves a comma-string symptom note for a given date. */
  saveSymptomsNote: (date: string, note: string): void => {
    try {
      const data = localStorage.getItem(k(BASE_SYMPTOMS));
      const entries: SymptomEntry[] = data
        ? (JSON.parse(data) as SymptomEntry[])
        : [];
      const idx = entries.findIndex((e) => e.date === date);
      if (idx >= 0) {
        entries[idx]!.note = note;
      } else {
        entries.unshift({ date, note });
      }
      localStorage.setItem(k(BASE_SYMPTOMS), JSON.stringify(entries));
    } catch {}
  },

  /**
   * Returns today's symptoms as a parsed string array.
   * Used when sending logs to the backend.
   */
  getSymptomsArray: (date: string): string[] => {
    const note = storage.getSymptomsNote(date);
    if (!note) return [];
    return note.split(",").map((s) => s.trim()).filter(Boolean);
  },

  // ── Routine ────────────────────────────────────────────────────────────────

  getRoutineRaw: (): { items: RoutineItem[]; date: string } | null => {
    try {
      const data = localStorage.getItem(k(BASE_ROUTINE));
      if (!data) return null;
      return JSON.parse(data) as { items: RoutineItem[]; date: string };
    } catch { return null; }
  },

  saveRoutine: (items: RoutineItem[]): void => {
    const today = new Date().toISOString().split("T")[0]!;
    localStorage.setItem(k(BASE_ROUTINE), JSON.stringify({ items, date: today }));
  },
};
