export type MoodEntry = {
  id: string;
  date: string;
  mood: string;
  note: string;
};

export type CycleData = {
  lastPeriodStart: string | null;
  cycleLength: number;
};

export type ProfileData = {
  nickname: string;
  avatarIndex: number;
};

export type WaterData = {
  date: string;
  glasses: number;
};

export type SymptomEntry = {
  id: string;
  date: string;
  symptoms: string[];
};

const MOODS_KEY = "luna_moods";
const CYCLE_KEY = "luna_cycle";
const PROFILE_KEY = "luna_profile";
const WATER_KEY = "luna_water";
const SYMPTOMS_KEY = "luna_symptoms";

export const storage = {
  getMoods: (): MoodEntry[] => {
    try {
      const data = localStorage.getItem(MOODS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addMood: (mood: Omit<MoodEntry, "id">) => {
    const moods = storage.getMoods();
    const newMood = { ...mood, id: crypto.randomUUID() };
    localStorage.setItem(MOODS_KEY, JSON.stringify([newMood, ...moods]));
    return newMood;
  },

  getLatestMood: (): MoodEntry | null => {
    const moods = storage.getMoods();
    return moods.length > 0 ? moods[0] : null;
  },

  getMoodStreak: (): number => {
    const moods = storage.getMoods();
    if (moods.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < moods.length; i++) {
      const moodDate = new Date(moods[i].date);
      moodDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round(Math.abs(today.getTime() - moodDate.getTime()) / 86400000);
      if (i === 0 && diffDays > 1) return 0;
      if (i > 0) {
        const prev = new Date(moods[i - 1].date);
        prev.setHours(0, 0, 0, 0);
        const d = Math.round(Math.abs(prev.getTime() - moodDate.getTime()) / 86400000);
        if (d > 1) break;
      }
      streak++;
    }
    return streak;
  },

  getCycle: (): CycleData => {
    try {
      const data = localStorage.getItem(CYCLE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return { lastPeriodStart: null, cycleLength: 28 };
  },

  saveCycle: (data: CycleData) => {
    localStorage.setItem(CYCLE_KEY, JSON.stringify(data));
  },

  getProfile: (): ProfileData => {
    try {
      const data = localStorage.getItem(PROFILE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return { nickname: "", avatarIndex: 0 };
  },

  saveProfile: (data: ProfileData) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
  },

  getWaterToday: (): number => {
    try {
      const data = localStorage.getItem(WATER_KEY);
      if (!data) return 0;
      const parsed: WaterData = JSON.parse(data);
      const today = new Date().toISOString().split("T")[0];
      if (parsed.date !== today) return 0;
      return parsed.glasses;
    } catch {
      return 0;
    }
  },

  logWater: (): number => {
    const today = new Date().toISOString().split("T")[0];
    const current = storage.getWaterToday();
    const next = Math.min(current + 1, 8);
    localStorage.setItem(WATER_KEY, JSON.stringify({ date: today, glasses: next }));
    return next;
  },

  resetWater: (): void => {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(WATER_KEY, JSON.stringify({ date: today, glasses: 0 }));
  },
};
