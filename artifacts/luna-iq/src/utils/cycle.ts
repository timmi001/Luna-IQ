import { addDays, differenceInDays } from "date-fns";

export type CyclePhase = "Menstrual" | "Follicular" | "Ovulation" | "Luteal" | "Unknown";

export const getCycleDetails = (lastPeriodStart: string | null, cycleLength: number) => {
  if (!lastPeriodStart) {
    return {
      currentDay: 0,
      phase: "Unknown" as CyclePhase,
      nextPeriodDate: null,
    };
  }

  const start = new Date(lastPeriodStart);
  const today = new Date();
  
  // Calculate days since last period
  const currentDay = (differenceInDays(today, start) % cycleLength) + 1;
  
  // Calculate next period date
  const cyclesPassed = Math.floor(differenceInDays(today, start) / cycleLength);
  const nextPeriodDate = addDays(start, (cyclesPassed + 1) * cycleLength);

  let phase: CyclePhase = "Unknown";
  if (currentDay >= 1 && currentDay <= 5) {
    phase = "Menstrual";
  } else if (currentDay >= 6 && currentDay <= 13) {
    phase = "Follicular";
  } else if (currentDay >= 14 && currentDay <= 16) {
    phase = "Ovulation";
  } else if (currentDay >= 17 && currentDay <= cycleLength) {
    phase = "Luteal";
  }

  return {
    currentDay,
    phase,
    nextPeriodDate
  };
};

export const getPhaseMessage = (phase: CyclePhase) => {
  switch (phase) {
    case "Menstrual":
      return "Your body needs rest right now. Be gentle with yourself.";
    case "Follicular":
      return "Your energy is rising! This is a great time to start new things.";
    case "Ovulation":
      return "You may feel your most vibrant today. Embrace your power.";
    case "Luteal":
      return "Your intuition is heightened. Listen to your needs.";
    default:
      return "Track your cycle to get personalized insights.";
  }
};

export const getPhaseColor = (phase: CyclePhase) => {
  switch (phase) {
    case "Menstrual":
      return "bg-rose-100 text-rose-700";
    case "Follicular":
      return "bg-luna-mint text-emerald-700";
    case "Ovulation":
      return "bg-luna-peach text-orange-700";
    case "Luteal":
      return "bg-luna-lavender text-purple-700";
    default:
      return "bg-gray-100 text-gray-500";
  }
};
