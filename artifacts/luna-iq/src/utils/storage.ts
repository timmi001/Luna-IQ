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

const MOODS_KEY = "luna_moods";
const CYCLE_KEY = "luna_cycle";

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
      
      const diffTime = Math.abs(today.getTime() - moodDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (i === 0 && diffDays > 1) {
        return 0; // Streak broken
      }
      
      if (i > 0) {
        const prevMoodDate = new Date(moods[i-1].date);
        prevMoodDate.setHours(0, 0, 0, 0);
        const diffBetween = Math.abs(prevMoodDate.getTime() - moodDate.getTime());
        const diffDaysBetween = Math.ceil(diffBetween / (1000 * 60 * 60 * 24));
        if (diffDaysBetween > 1) {
          break;
        }
      }
      streak++;
    }
    return streak;
  },

  getCycle: (): CycleData => {
    try {
      const data = localStorage.getItem(CYCLE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    
    return {
      lastPeriodStart: null,
      cycleLength: 28
    };
  },

  saveCycle: (data: CycleData) => {
    localStorage.setItem(CYCLE_KEY, JSON.stringify(data));
  }
};
