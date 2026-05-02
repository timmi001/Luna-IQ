import { useState } from "react";
import { storage } from "@/utils/storage";

export function WaterIntakeCard() {
  const [glasses, setGlasses] = useState(() => storage.getWaterToday());
  const target = 8;
  const pct = Math.min((glasses / target) * 100, 100);

  const handleAdd = () => {
    if (glasses < target) {
      const next = storage.logWater();
      setGlasses(next);
    }
  };

  const handleReset = () => {
    storage.resetWater();
    setGlasses(0);
  };

  const waterColor = pct < 40 ? "#93C5FD" : pct < 70 ? "#60A5FA" : "#3B82F6";

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm border border-card-border flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Water</p>
        <button onClick={handleReset} className="text-[10px] text-blue-300 hover:text-blue-400">
          reset
        </button>
      </div>

      <div className="flex items-end gap-3 justify-center">
        {/* Glass visual */}
        <div className="relative flex flex-col items-center">
          {/* Glass shape */}
          <div
            style={{
              width: 36,
              height: 54,
              border: "3px solid #BFDBFE",
              borderTop: "none",
              borderRadius: "0 0 14px 14px",
              position: "relative",
              overflow: "hidden",
              backgroundColor: "rgba(219, 234, 254, 0.18)",
            }}
          >
            {/* Water fill */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: `${pct}%`,
                background: `linear-gradient(to top, ${waterColor}, #BFDBFE)`,
                transition: "height 0.6s ease",
                borderRadius: "0 0 11px 11px",
              }}
            />
            {/* Shine */}
            {pct > 10 && (
              <div
                style={{
                  position: "absolute",
                  top: "20%",
                  left: "25%",
                  width: "18%",
                  height: "45%",
                  background: "rgba(255,255,255,0.45)",
                  borderRadius: "50%",
                  zIndex: 2,
                }}
              />
            )}
          </div>
          {/* Glass rim */}
          <div
            style={{
              width: 40,
              height: 6,
              borderRadius: "50%",
              background: "linear-gradient(90deg, #DBEAFE, #93C5FD, #DBEAFE)",
              marginBottom: -2,
            }}
          />
        </div>

        {/* Count */}
        <div className="flex flex-col items-start">
          <span className="text-2xl font-bold text-blue-500">{glasses}</span>
          <span className="text-[10px] text-muted-foreground">of {target} glasses</span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 justify-center">
        {Array.from({ length: target }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: i < glasses ? waterColor : "#DBEAFE",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>

      <button
        onClick={handleAdd}
        disabled={glasses >= target}
        className="w-full py-2 rounded-2xl text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-40"
      >
        {glasses >= target ? "Daily goal reached! 💧" : "+ Add a glass"}
      </button>
    </div>
  );
}
