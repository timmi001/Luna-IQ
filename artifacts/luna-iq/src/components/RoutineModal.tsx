import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, Check } from "lucide-react";

const ROUTINE = [
  { time: "7:00 AM", text: "Warm water with lime", icon: "🍋", section: "morning" },
  { time: "7:30 AM", text: "Light stretching or yoga", icon: "🧘‍♀️", section: "morning" },
  { time: "8:00 AM", text: "Nourishing breakfast", icon: "🥗", section: "morning" },
  { time: "9:00 AM", text: "Set your daily intention", icon: "💫", section: "morning" },
  { time: "12:00 PM", text: "Mindful lunch & rest", icon: "🌿", section: "afternoon" },
  { time: "3:00 PM", text: "Hydrate & step outside", icon: "💧", section: "afternoon" },
  { time: "5:00 PM", text: "Gentle movement or walk", icon: "🚶‍♀️", section: "afternoon" },
  { time: "7:00 PM", text: "Light dinner", icon: "🥙", section: "evening" },
  { time: "8:30 PM", text: "Digital wind-down", icon: "📵", section: "evening" },
  { time: "9:00 PM", text: "Skincare ritual", icon: "✨", section: "evening" },
  { time: "9:30 PM", text: "Journaling & gratitude", icon: "📔", section: "evening" },
  { time: "10:00 PM", text: "Lights out, rest well", icon: "🌙", section: "evening" },
];

const SECTION_LABELS: Record<string, string> = {
  morning: "Morning ☀️",
  afternoon: "Afternoon 🌤",
  evening: "Evening 🌙",
};

export function RoutineModal() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleCheck = (time: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(time)) next.delete(time);
      else next.add(time);
      return next;
    });
  };

  const sections = ["morning", "afternoon", "evening"] as const;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-white rounded-3xl p-4 shadow-sm border border-card-border flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
      >
        <span style={{ fontSize: 28 }}>🗓</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">My Routine</p>
          <p className="text-xs text-muted-foreground">
            {checked.size} of {ROUTINE.length} done today
          </p>
        </div>
        <div className="flex items-center gap-1">
          {checked.size > 0 && (
            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
              <Check className="w-3 h-3 text-purple-500" />
            </div>
          )}
          <span className="text-muted-foreground text-xs">›</span>
        </div>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto pb-10" style={{ background: "linear-gradient(180deg, #FFF7FB 0%, #F6F0FF 100%)" }}>
          <SheetHeader className="pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-semibold text-foreground">Daily Routine 🌸</SheetTitle>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              {checked.size} of {ROUTINE.length} completed — you're doing great 💕
            </p>
          </SheetHeader>

          <div className="flex flex-col gap-5 mt-4">
            {sections.map((sec) => (
              <div key={sec}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {SECTION_LABELS[sec]}
                </p>
                <div className="flex flex-col gap-2">
                  {ROUTINE.filter((r) => r.section === sec).map((item) => {
                    const done = checked.has(item.time);
                    return (
                      <button
                        key={item.time}
                        onClick={() => toggleCheck(item.time)}
                        className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-card-border active:scale-[0.98] transition-transform text-left"
                      >
                        <span style={{ fontSize: 20, opacity: done ? 0.5 : 1 }}>{item.icon}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-medium transition-all ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {item.text}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
                        </div>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all"
                          style={{
                            borderColor: done ? "#A78BFA" : "#E5E7EB",
                            background: done ? "#A78BFA" : "transparent",
                          }}
                        >
                          {done && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
