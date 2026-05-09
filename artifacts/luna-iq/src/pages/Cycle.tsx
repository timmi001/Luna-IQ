import { useState, useMemo, useRef } from "react";
import { storage } from "@/utils/storage";
import { getCycleDetails, CyclePhase } from "@/utils/cycle";
import { useAuth } from "@/contexts/AuthContext";
import { addPoints } from "@/lib/points";

import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, differenceInDays, isSameDay, isToday, isFuture } from "date-fns";
import { ChevronLeft, ChevronRight, SendHorizonal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Symptom helpers ────────────────────────────────────────────────────────────
function getTodaySymptomNote(): string {
  try {
    const raw = localStorage.getItem("luna_symptoms");
    if (!raw) return "";
    const entries = JSON.parse(raw) as { date: string; note: string }[];
    const today = new Date().toISOString().split("T")[0];
    return entries.find((e) => e.date === today)?.note ?? "";
  } catch { return ""; }
}
function saveSymptomNote(note: string) {
  try {
    const raw = localStorage.getItem("luna_symptoms");
    const entries: { date: string; note: string }[] = raw ? JSON.parse(raw) : [];
    const today = new Date().toISOString().split("T")[0];
    const idx = entries.findIndex((e) => e.date === today);
    if (idx >= 0) entries[idx].note = note;
    else entries.unshift({ date: today, note });
    localStorage.setItem("luna_symptoms", JSON.stringify(entries));
  } catch {}
}

// ── Phase helpers ──────────────────────────────────────────────────────────────
function getDayPhase(date: Date, lastPeriodStart: string | null, cycleLength: number): CyclePhase {
  if (!lastPeriodStart) return "Unknown";
  const start = new Date(lastPeriodStart);
  const diff = differenceInDays(date, start);
  if (diff < 0) return "Unknown";
  const dayInCycle = (diff % cycleLength) + 1;
  if (dayInCycle <= 5) return "Menstrual";
  if (dayInCycle <= 13) return "Follicular";
  if (dayInCycle <= 16) return "Ovulation";
  return "Luteal";
}

const PHASE_STYLE: Record<CyclePhase, { bg: string; dot: string; label: string; text: string }> = {
  Menstrual:  { bg: "#fee2e2", dot: "#ef4444", label: "Menstrual",  text: "#991b1b" },
  Follicular: { bg: "#dcfce7", dot: "#22c55e", label: "Follicular", text: "#14532d" },
  Ovulation:  { bg: "#ffedd5", dot: "#f97316", label: "Ovulation",  text: "#9a3412" },
  Luteal:     { bg: "#ede9fe", dot: "#8b5cf6", label: "Luteal",     text: "#4c1d95" },
  Unknown:    { bg: "#f3f4f6", dot: "#9ca3af", label: "—",          text: "#6b7280" },
};

const PHASE_DESC: Record<string, string> = {
  Menstrual:  "Rest & restore. Your body is shedding — warmth and iron-rich foods help.",
  Follicular: "Energy is rising. Great time to plan, learn and start fresh projects.",
  Ovulation:  "Peak confidence & fertility window. You feel magnetic — embrace it.",
  Luteal:     "Slow down. Progesterone rises; nourish yourself with magnesium-rich foods.",
  Unknown:    "Log your last period date to see your personalised cycle phases.",
};

// ── Flow options ───────────────────────────────────────────────────────────────
const FLOW_OPTIONS = [
  { label: "No Bleeding", emoji: "⚪" },
  { label: "Spotting",    emoji: "🩸" },
  { label: "Light",       emoji: "💧" },
  { label: "Medium",      emoji: "🌊" },
  { label: "Heavy",       emoji: "❗" },
];

const TABS = ["Cycle", "Energy", "Mood"];

// ── Energy chart ───────────────────────────────────────────────────────────────
const ENERGY_DATA = [55,48,40,38,45,55,65,72,78,82,88,90,95,90,82,75,70,65,60,58,55,52,50,48,50,52,55,58];

function EnergyChart({ cycleLength, currentDay }: { cycleLength: number; currentDay: number }) {
  const w = 320, h = 100, pad = 12;
  const pts = ENERGY_DATA.slice(0, cycleLength);
  const max = 100, min = 30;
  const xs = pts.map((_, i) => pad + (i / (pts.length - 1)) * (w - pad * 2));
  const ys = pts.map((v) => pad + ((max - v) / (max - min)) * (h - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const fill = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ") + ` L ${xs[xs.length-1]} ${h} L ${xs[0]} ${h} Z`;
  const ci = Math.min(currentDay - 1, pts.length - 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 100 }}>
      <defs>
        <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#eg)" />
      <path d={d} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[ci]} cy={ys[ci]} r="4" fill="#7c3aed" />
      <line x1={xs[ci]} y1={pad} x2={xs[ci]} y2={h} stroke="#7c3aed" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
    </svg>
  );
}

// ── Flo-style Calendar ─────────────────────────────────────────────────────────
function CycleCalendar({ lastPeriodStart, cycleLength }: { lastPeriodStart: string | null; cycleLength: number }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date | null>(today);

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Offset so grid starts on Monday (0=Mon … 6=Sun)
  const startWeekday = (getDay(monthStart) + 6) % 7;
  const blanks = Array.from({ length: startWeekday });

  const selectedPhase = selected ? getDayPhase(selected, lastPeriodStart, cycleLength) : "Unknown";
  const selectedStyle = PHASE_STYLE[selectedPhase];

  // Compute ovulation day of each cycle repeat visible in the month
  const ovulationDays: string[] = [];
  if (lastPeriodStart) {
    const start = new Date(lastPeriodStart);
    for (let n = -2; n <= 6; n++) {
      const ovDay = addDays(start, n * cycleLength + Math.round(cycleLength / 2) - 1);
      ovulationDays.push(format(ovDay, "yyyy-MM-dd"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Month nav */}
      <div className="flex items-center justify-between px-1">
        <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted/30 active:scale-90 transition-transform">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <p className="text-sm font-semibold text-foreground">{format(viewMonth, "MMMM yyyy")}</p>
        <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted/30 active:scale-90 transition-transform">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1.5">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(day => {
          const phase = getDayPhase(day, lastPeriodStart, cycleLength);
          const style = PHASE_STYLE[phase];
          const todayDay = isToday(day);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const future = isFuture(day);
          const isOvulation = ovulationDays.includes(format(day, "yyyy-MM-dd")) && phase !== "Unknown";

          return (
            <button
              key={format(day, "yyyy-MM-dd")}
              onClick={() => setSelected(day)}
              className="relative flex flex-col items-center justify-center py-1 rounded-xl transition-all active:scale-90"
              style={{
                background: isSelected
                  ? style.dot
                  : phase !== "Unknown"
                    ? style.bg
                    : "transparent",
                opacity: future && phase === "Unknown" ? 0.4 : 1,
              }}
            >
              {/* Today ring */}
              {todayDay && !isSelected && (
                <span className="absolute inset-0.5 rounded-[10px] border-2 pointer-events-none" style={{ borderColor: style.dot }} />
              )}
              {/* Ovulation drop dot */}
              {isOvulation && !isSelected && (
                <span className="absolute top-0.5 right-1 w-1 h-1 rounded-full" style={{ background: "#fb923c" }} />
              )}
              <span className="text-xs font-semibold leading-none"
                style={{ color: isSelected ? "#fff" : todayDay ? style.dot : phase !== "Unknown" ? style.text : "#9ca3af" }}>
                {format(day, "d")}
              </span>
              {/* Phase dot under number */}
              {phase !== "Unknown" && !isSelected && (
                <span className="mt-0.5 w-1 h-1 rounded-full" style={{ background: style.dot }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day info */}
      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={format(selected, "yyyy-MM-dd")}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl px-4 py-3 border mt-1"
            style={{ background: selectedStyle.bg, borderColor: selectedStyle.dot + "44" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: selectedStyle.dot }} />
              <p className="text-xs font-semibold" style={{ color: selectedStyle.text }}>
                {format(selected, "EEEE, MMM d")} · {selectedStyle.label}
              </p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{PHASE_DESC[selectedPhase]}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
        {(["Menstrual","Follicular","Ovulation","Luteal"] as CyclePhase[]).map(p => (
          <div key={p} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: PHASE_STYLE[p].dot }} />
            <span className="text-[10px] text-muted-foreground">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Cycle() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(storage.getCycle());
  const [activeTab, setActiveTab] = useState("Cycle");
  const [flow, setFlow] = useState<string | null>(null);
  const [logDate, setLogDate] = useState(format(new Date(), "MM/dd/yyyy"));
  const [symptomInput, setSymptomInput] = useState("");
  const [savedNote, setSavedNote] = useState(() => getTodaySymptomNote());
  const [showSaved, setShowSaved] = useState(false);
  const symptomRef = useRef<HTMLInputElement>(null);
  const [moodMap] = useState<Record<string, string>>(() => {
    try {
      const moods = storage.getMoods();
      const map: Record<string, string> = {};
      moods.forEach((m) => { map[m.date.split("T")[0]] = m.mood.split(" ")[0]; });
      return map;
    } catch { return {}; }
  });

  const { currentDay, phase, nextPeriodDate } = getCycleDetails(data.lastPeriodStart, data.cycleLength);
  const cycleLen = data.cycleLength;

  const ovulationDay = Math.round(cycleLen / 2) - 1;
  const periodDays = 5;
  const nextPeriodStr = nextPeriodDate ? format(nextPeriodDate, "MMM d") : "--";
  const ovulationStr = data.lastPeriodStart
    ? format(addDays(new Date(data.lastPeriodStart), ovulationDay), "MMM d")
    : "--";

  const handleSaveSymptom = () => {
    const trimmed = symptomInput.trim();
    if (!trimmed) return;
    const updated = savedNote ? `${savedNote}, ${trimmed}` : trimmed;
    setSavedNote(updated);
    saveSymptomNote(updated);
    setSymptomInput("");
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 1600);
  };

  const handleLogCycle = async () => {
    if (!flow) { toast({ title: "Select a flow intensity first", variant: "destructive" }); return; }
    const parts = logDate.split("/");
    let iso = "";
    if (parts.length === 3) iso = `${parts[2]}-${parts[0].padStart(2,"0")}-${parts[1].padStart(2,"0")}`;
    if (!iso || isNaN(Date.parse(iso))) {
      toast({ title: "Invalid date", description: "Use MM/DD/YYYY format", variant: "destructive" }); return;
    }
    const updated = { lastPeriodStart: iso, cycleLength: cycleLen };
    storage.saveCycle(updated);
    setData(updated);
    toast({ title: "Cycle logged 🌸", description: `${flow} flow on ${logDate}` });

    if (user?.id) {
      addPoints(user.id, "cycle_log").then(({ awarded, bonus }) => {
        if (awarded) {
          toast({
            title: "+5 Luna Points earned 💜",
            description: bonus > 0 ? `Streak bonus: +${bonus} pts! 🔥` : "Tracking your cycle is an act of self-care 🌸",
          });
        }
      }).catch(() => {});
    }

    // Build symptom list from flow + any noted symptoms
    const symptomList = [
      `Flow: ${flow}`,
      ...savedNote.split(",").map((s) => s.trim()).filter(Boolean),
    ];

    // The logged date is the period start → Menstrual phase, day 1
    try {
      await fetch(`${BASE}/api/luna/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id ?? "guest",
          date: iso,
          cyclePhase: "Menstrual",
          dayOfCycle: 1,
          mood: "neutral",
          symptoms: symptomList,
        }),
      });
    } catch {
      // Silently ignore — local save already succeeded
    }
  };

  const calendarDays = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const d = addDays(new Date(), -(27 - i));
      const key = format(d, "yyyy-MM-dd");
      return { date: d, key, emoji: moodMap[key] ?? null, day: format(d, "d") };
    });
  }, [moodMap]);

  return (
    <PageTransition className="flex flex-col min-h-screen">
      <header className="px-5 pt-12 pb-3">
        <h1 className="text-2xl font-semibold text-foreground">My Cycle</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track and understand your rhythm</p>
      </header>

      {/* Tabs */}
      <div className="px-5 mb-2">
        <div className="flex gap-1 bg-white rounded-2xl p-1 border border-card-border shadow-sm">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={activeTab === t
                ? { background: "linear-gradient(135deg,#7c3aed,#db2777)", color: "#fff", boxShadow: "0 2px 8px rgba(124,58,237,0.35)" }
                : { color: "#6b7280" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-5 pb-20 flex flex-col gap-4 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ── CYCLE TAB ── */}
          {activeTab === "Cycle" && (
            <motion.div key="cycle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">

              {/* Flo-style Calendar */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
                <CycleCalendar lastPeriodStart={data.lastPeriodStart} cycleLength={cycleLen} />
              </div>

              {/* Log form */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Log Your Cycle</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {FLOW_OPTIONS.map(f => (
                    <button key={f.label} onClick={() => setFlow(f.label)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95"
                      style={flow === f.label
                        ? { background: "linear-gradient(135deg,#ede9fe,#fce7f3)", borderColor: "#8b5cf6", color: "#4c1d95" }
                        : { background: "#f3f4f6", borderColor: "#d1d5db", color: "#4b5563" }}>
                      <span>{f.emoji}</span>{f.label}
                    </button>
                  ))}
                </div>
                <div className="mb-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Date (MM/DD/YYYY)</p>
                  <input value={logDate} onChange={e => setLogDate(e.target.value)} placeholder="MM/DD/YYYY"
                    className="w-full bg-muted/30 rounded-xl px-3 py-2.5 text-sm outline-none border border-border/30 focus:border-purple-300 transition-colors" />
                </div>
                {/* Symptoms */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Symptoms</p>
                    <AnimatePresence>
                      {showSaved && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-emerald-500 font-semibold">✓ Logged</motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  {savedNote && (
                    <p className="text-[11px] text-foreground/70 mb-1.5 leading-relaxed bg-luna-blush/10 rounded-xl px-3 py-2 border border-luna-blush/20">{savedNote}</p>
                  )}
                  <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2 border border-border/30 focus-within:border-purple-300 transition-colors">
                    <input
                      ref={symptomRef}
                      value={symptomInput}
                      onChange={(e) => setSymptomInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveSymptom(); }}
                      placeholder={savedNote ? "Add more symptoms…" : "e.g. cramps, headache, bloating…"}
                      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <button
                      onClick={handleSaveSymptom}
                      disabled={!symptomInput.trim()}
                      className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 active:scale-90"
                      style={{ background: symptomInput.trim() ? "linear-gradient(135deg,#f9a8d4,#c4b5fd)" : "transparent" }}
                    >
                      <SendHorizonal className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>

                <button onClick={handleLogCycle}
                  className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold shadow-md active:scale-[0.98] transition-transform"
                  style={{ background: "linear-gradient(135deg,#c4b5fd,#f9a8d4)" }}>
                  + Log for Today
                </button>
              </div>

              {/* Cycle Summary */}
              <div className="bg-white rounded-2xl p-4 border border-card-border shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cycle Summary</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Period Days",   value: `${periodDays} days`, icon: "🩸" },
                    { label: "Ovulation Day", value: ovulationStr,          icon: "🌸" },
                    { label: "Cycle Length",  value: `${cycleLen} days`,   icon: "📅" },
                    { label: "Next Period",   value: nextPeriodStr,          icon: "🔄" },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2 bg-muted/20 rounded-xl p-3 border border-border/20">
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ENERGY TAB ── */}
          {activeTab === "Energy" && (
            <motion.div key="energy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
                <p className="text-sm font-semibold mb-1">Energy across your cycle</p>
                <p className="text-xs text-muted-foreground mb-4">Purple dot marks today</p>
                <EnergyChart cycleLength={cycleLen} currentDay={currentDay} />
                <div className="flex justify-between mt-1 px-3">
                  {["Day 1","Day 7","Day 14","Day 21",`Day ${cycleLen}`].map(l => (
                    <span key={l} className="text-[9px] text-muted-foreground">{l}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { phase: "Menstrual",  energy: "Low",       tip: "Rest & restore",      color: "#f87171" },
                  { phase: "Follicular", energy: "Rising",    tip: "Start new things",    color: "#86efac" },
                  { phase: "Ovulation",  energy: "Peak",      tip: "Social & bold tasks", color: "#fdba74" },
                  { phase: "Luteal",     energy: "Declining", tip: "Reflect & complete",  color: "#c4b5fd" },
                ].map(e => (
                  <div key={e.phase} className="bg-white rounded-2xl p-3 border border-card-border shadow-sm">
                    <div className="w-2 h-2 rounded-full mb-2" style={{ background: e.color }} />
                    <p className="text-xs font-semibold text-foreground">{e.phase}</p>
                    <p className="text-[10px] text-muted-foreground">{e.energy} energy</p>
                    <p className="text-[10px] text-purple-500 mt-1">{e.tip}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── MOOD CALENDAR TAB ── */}
          {activeTab === "Mood" && (
            <motion.div key="mood" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
                <p className="text-sm font-semibold mb-1">Mood Calendar</p>
                <p className="text-xs text-muted-foreground mb-4">Last 28 days</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d => (
                    <div key={d} className="text-center text-[9px] text-muted-foreground font-semibold pb-1">{d}</div>
                  ))}
                  {calendarDays.map(d => (
                    <div key={d.key} className="aspect-square rounded-xl flex flex-col items-center justify-center text-center"
                      style={{ background: d.emoji ? "#fdf4ff" : "#f9fafb", border: `1px solid ${d.emoji ? "#e9d5ff" : "#f3f4f6"}` }}>
                      {d.emoji
                        ? <span className="text-base leading-none">{d.emoji}</span>
                        : <span className="text-[9px] text-muted-foreground/50">{d.day}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </PageTransition>
  );
}
