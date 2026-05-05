import { useState, useMemo } from "react";
import { storage } from "@/utils/storage";
import { getCycleDetails, getPhaseMessage, CyclePhase } from "@/utils/cycle";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

// ─── SVG Ring helpers ──────────────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

const PHASES_RING = [
  { label: "Menstrual", days: 5, color: "#f87171", textColor: "#b91c1c" },
  { label: "Follicular", days: 8, color: "#86efac", textColor: "#15803d" },
  { label: "Ovulation", days: 3, color: "#fdba74", textColor: "#c2410c" },
  { label: "Luteal", days: 12, color: "#c4b5fd", textColor: "#6d28d9" },
];

const FLOW_OPTIONS = [
  { label: "No Bleeding", emoji: "⚪" },
  { label: "Spotting", emoji: "🩸" },
  { label: "Light", emoji: "💧" },
  { label: "Medium", emoji: "🌊" },
  { label: "Heavy", emoji: "❗" },
];

const TABS = ["Cycle", "Energy", "Mood"];

// Energy curve data (28 points approximating a realistic cycle energy curve)
const ENERGY_DATA = [
  55, 48, 40, 38, 45, 55, 65, 72, 78, 82, 88, 90, 95, 90, 82, 75, 70, 65, 60, 58, 55, 52, 50, 48, 50, 52, 55, 58
];

function EnergyChart({ cycleLength, currentDay }: { cycleLength: number; currentDay: number }) {
  const w = 320, h = 100, pad = 12;
  const pts = ENERGY_DATA.slice(0, cycleLength);
  const max = 100, min = 30;
  const xs = pts.map((_, i) => pad + (i / (pts.length - 1)) * (w - pad * 2));
  const ys = pts.map((v) => pad + ((max - v) / (max - min)) * (h - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const fill = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ") + ` L ${xs[xs.length - 1]} ${h} L ${xs[0]} ${h} Z`;
  const todayX = pad + ((Math.min(currentDay - 1, pts.length - 1)) / (pts.length - 1)) * (w - pad * 2);
  const todayY = ys[Math.min(currentDay - 1, pts.length - 1)];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 100 }}>
      <defs>
        <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#energyGrad)" />
      <path d={d} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={todayX} cy={todayY} r="4" fill="#7c3aed" />
      <line x1={todayX} y1={pad} x2={todayX} y2={h} stroke="#7c3aed" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
    </svg>
  );
}

export default function Cycle() {
  const { toast } = useToast();
  const [data, setData] = useState(storage.getCycle());
  const [activeTab, setActiveTab] = useState("Cycle");
  const [flow, setFlow] = useState<string | null>(null);
  const [logDate, setLogDate] = useState(format(new Date(), "MM/dd/yyyy"));
  const [showLogModal, setShowLogModal] = useState(false);
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

  // Compute ring segments
  const totalDays = PHASES_RING.reduce((s, p) => s + p.days, 0);
  let cursor = 0;
  const segments = PHASES_RING.map((p) => {
    const start = (cursor / totalDays) * 360;
    cursor += p.days;
    const end = (cursor / totalDays) * 360;
    return { ...p, start, end };
  });

  // Current day dot position on ring
  const dayAngle = ((currentDay - 1) / cycleLen) * 360;
  const CX = 110, CY = 110, R_OUTER = 92, R_INNER = 68, R_DOT = 98;

  // Compute stats
  const ovulationDay = Math.round(cycleLen / 2) - 1;
  const periodDays = 5;
  const nextPeriodStr = nextPeriodDate ? format(nextPeriodDate, "MMM d") : "--";
  const ovulationStr = data.lastPeriodStart
    ? format(addDays(new Date(data.lastPeriodStart), ovulationDay), "MMM d")
    : "--";

  const handleLogCycle = () => {
    if (!flow) { toast({ title: "Select a flow intensity first", variant: "destructive" }); return; }
    // Parse mm/dd/yyyy → yyyy-mm-dd
    const parts = logDate.split("/");
    let iso = "";
    if (parts.length === 3) {
      iso = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
    }
    if (!iso || isNaN(Date.parse(iso))) {
      toast({ title: "Invalid date", description: "Use MM/DD/YYYY format", variant: "destructive" }); return;
    }
    const updated = { lastPeriodStart: iso, cycleLength: cycleLen };
    storage.saveCycle(updated);
    setData(updated);
    setShowLogModal(false);
    toast({ title: "Cycle logged 🌸", description: `${flow} flow on ${logDate}` });
  };

  // Mood calendar — last 28 days grid
  const calendarDays = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const d = addDays(new Date(), -(27 - i));
      const key = format(d, "yyyy-MM-dd");
      return { date: d, key, emoji: moodMap[key] ?? null, day: format(d, "d") };
    });
  }, [moodMap]);

  const phaseDescriptions: Record<string, string> = {
    Menstrual: "Your body is shedding its lining. Rest, warmth and iron-rich foods support you now.",
    Follicular: "Your body is in a growth & energy building phase. Oestrogen rises — you feel sharper and lighter.",
    Ovulation: "Peak energy and confidence. Your body is at its most fertile and magnetic.",
    Luteal: "Progesterone rises. Honour slower energy, nourish with magnesium-rich foods.",
    Unknown: "Log your cycle start date to receive personalised phase insights.",
  };

  return (
    <PageTransition className="flex flex-col min-h-screen bg-[#faf8ff]">
      {/* Header */}
      <header className="px-5 pt-12 pb-3">
        <h1 className="text-2xl font-semibold text-foreground">My Cycle</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track and understand your rhythm</p>
      </header>

      {/* Tabs */}
      <div className="px-5 mb-2">
        <div className="flex gap-1 bg-white rounded-2xl p-1 border border-card-border shadow-sm overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={activeTab === t
                ? { background: "linear-gradient(135deg,#c4b5fd,#f9a8d4)", color: "#fff" }
                : { color: "#9ca3af" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-5 pb-28 flex flex-col gap-4 overflow-y-auto">

        <AnimatePresence mode="wait">
          {/* ── CYCLE TAB ── */}
          {activeTab === "Cycle" && (
            <motion.div key="cycle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-card-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Log Your Cycle</p>
                {/* Flow selector */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {FLOW_OPTIONS.map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setFlow(f.label)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95"
                      style={flow === f.label
                        ? { background: "linear-gradient(135deg,#fce7f3,#ede9fe)", borderColor: "#c4b5fd", color: "#6d28d9" }
                        : { background: "#f9f9f9", borderColor: "#e5e7eb", color: "#6b7280" }}
                    >
                      <span>{f.emoji}</span>{f.label}
                    </button>
                  ))}
                </div>

                {/* Date input */}
                <div className="mb-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Date (MM/DD/YYYY)</p>
                  <input
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    placeholder="MM/DD/YYYY"
                    className="w-full bg-muted/30 rounded-xl px-3 py-2.5 text-sm outline-none border border-border/30 focus:border-purple-300 transition-colors"
                  />
                </div>

                <button
                  onClick={handleLogCycle}
                  className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold shadow-md active:scale-[0.98] transition-transform"
                  style={{ background: "linear-gradient(135deg,#c4b5fd,#f9a8d4)" }}
                >
                  + Log for Today
                </button>
              </div>

              {/* Cycle Summary */}
              <div className="bg-white rounded-2xl p-4 border border-card-border shadow-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cycle Summary</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Period Days", value: `${periodDays} days`, icon: "🩸" },
                    { label: "Ovulation Day", value: ovulationStr, icon: "🌸" },
                    { label: "Cycle Length", value: `${cycleLen} days`, icon: "📅" },
                    { label: "Next Period", value: nextPeriodStr, icon: "🔄" },
                  ].map((s) => (
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
                {/* X-axis labels */}
                <div className="flex justify-between mt-1 px-3">
                  {["Day 1", "Day 7", "Day 14", "Day 21", `Day ${cycleLen}`].map((l) => (
                    <span key={l} className="text-[9px] text-muted-foreground">{l}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { phase: "Menstrual", energy: "Low", tip: "Rest & restore", color: "#f87171" },
                  { phase: "Follicular", energy: "Rising", tip: "Start new things", color: "#86efac" },
                  { phase: "Ovulation", energy: "Peak", tip: "Social & bold tasks", color: "#fdba74" },
                  { phase: "Luteal", energy: "Declining", tip: "Reflect & complete", color: "#c4b5fd" },
                ].map((e) => (
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
                  {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                    <div key={d} className="text-center text-[9px] text-muted-foreground font-semibold pb-1">{d}</div>
                  ))}
                  {calendarDays.map((d) => (
                    <div
                      key={d.key}
                      className="aspect-square rounded-xl flex flex-col items-center justify-center text-center"
                      style={{ background: d.emoji ? "#fdf4ff" : "#f9fafb", border: `1px solid ${d.emoji ? "#e9d5ff" : "#f3f4f6"}` }}
                    >
                      {d.emoji
                        ? <span className="text-base leading-none">{d.emoji}</span>
                        : <span className="text-[9px] text-muted-foreground/50">{d.day}</span>
                      }
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
