import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_CYCLE,
  fetchCycleFromProfile,
  saveCycleToProfile,
} from "@/lib/cycleProfile";
import {
  getCycleDetails,
  getDaysUntilNextPeriod,
  type CyclePhase,
} from "@/utils/cycle";
import { storage, type CycleData } from "@/utils/storage";

type CycleContextValue = {
  cycleData: CycleData;
  phase: CyclePhase;
  currentDay: number;
  nextPeriodDate: Date | null;
  daysUntilNextPeriod: number | null;
  loading: boolean;
  saveCycle: (data: CycleData) => Promise<void>;
  refreshCycle: () => Promise<void>;
};

const CycleContext = createContext<CycleContextValue | null>(null);

async function resolveCycleForUser(userId: string): Promise<CycleData> {
  const remote = await fetchCycleFromProfile(userId);
  const local = storage.getCycle();

  if (remote?.lastPeriodStart) {
    storage.saveCycle(remote);
    return remote;
  }

  if (local.lastPeriodStart) {
    await saveCycleToProfile(userId, local);
    return local;
  }

  if (remote) {
    storage.saveCycle(remote);
    return remote;
  }

  return local.lastPeriodStart ? local : DEFAULT_CYCLE;
}

export function CycleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [cycleData, setCycleData] = useState<CycleData>(DEFAULT_CYCLE);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef<string | null>(null);

  const refreshCycle = useCallback(async () => {
    if (!userId) {
      setCycleData(DEFAULT_CYCLE);
      setLoading(false);
      return;
    }

    if (fetchingRef.current === userId) return;
    fetchingRef.current = userId;
    setLoading(true);

    try {
      const resolved = await resolveCycleForUser(userId);
      setCycleData(resolved);
      console.log(
        "[Luna Cycle] hydrated | lastPeriod:",
        resolved.lastPeriodStart ?? "(none)",
      );
    } finally {
      if (fetchingRef.current === userId) fetchingRef.current = null;
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshCycle();
  }, [refreshCycle]);

  const saveCycle = useCallback(
    async (data: CycleData) => {
      const normalized: CycleData = {
        lastPeriodStart: data.lastPeriodStart,
        cycleLength:
          data.cycleLength > 0 ? data.cycleLength : DEFAULT_CYCLE.cycleLength,
      };
      storage.saveCycle(normalized);
      setCycleData(normalized);
      if (userId) {
        await saveCycleToProfile(userId, normalized);
      }
    },
    [userId],
  );

  const { phase, currentDay, nextPeriodDate } = useMemo(
    () => getCycleDetails(cycleData.lastPeriodStart, cycleData.cycleLength),
    [cycleData.lastPeriodStart, cycleData.cycleLength],
  );

  const daysUntilNextPeriod = useMemo(
    () => getDaysUntilNextPeriod(nextPeriodDate),
    [nextPeriodDate],
  );

  const value = useMemo(
    () => ({
      cycleData,
      phase,
      currentDay,
      nextPeriodDate,
      daysUntilNextPeriod,
      loading,
      saveCycle,
      refreshCycle,
    }),
    [
      cycleData,
      phase,
      currentDay,
      nextPeriodDate,
      daysUntilNextPeriod,
      loading,
      saveCycle,
      refreshCycle,
    ],
  );

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>;
}

export function useCycle() {
  const ctx = useContext(CycleContext);
  if (!ctx) throw new Error("useCycle must be used within CycleProvider");
  return ctx;
}
