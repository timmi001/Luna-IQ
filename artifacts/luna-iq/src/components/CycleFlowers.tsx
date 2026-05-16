import { motion } from "framer-motion";

interface FlowerProps {
  size?: number;
  petalColor: string;
  centerColor: string;
  petals?: number;
  swayDuration?: number;
  swayDelay?: number;
  swayAmount?: number;
}

function Flower({ size = 60, petalColor, centerColor, petals = 5, swayDuration = 3, swayDelay = 0, swayAmount = 10 }: FlowerProps) {
  const cx = size / 2;
  const cy = size / 2;
  const petalW = size * 0.22;
  const petalH = size * 0.38;
  const centerR = size * 0.14;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      animate={{ rotate: [0, swayAmount, -swayAmount, 0] }}
      transition={{ duration: swayDuration, delay: swayDelay, repeat: Infinity, ease: "easeInOut" }}
      style={{ overflow: "visible" }}
    >
      {Array.from({ length: petals }).map((_, i) => {
        const angle = (i * 360) / petals;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={cy - petalH * 0.55}
            rx={petalW / 2}
            ry={petalH / 2}
            fill={petalColor}
            opacity={0.88}
            transform={`rotate(${angle} ${cx} ${cy})`}
          />
        );
      })}
      <motion.circle
        cx={cx} cy={cy} r={centerR}
        fill={centerColor}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, delay: swayDelay, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function CycleFlowers({ phase }: { phase: string }) {
  const phaseAccents: Record<string, { a: string; b: string; c: string }> = {
    Menstrual:  { a: "#E8534A", b: "#F06292", c: "#EF9A9A" },
    Follicular: { a: "#AB47BC", b: "#EC407A", c: "#F48FB1" },
    Ovulation:  { a: "#FF7043", b: "#EC407A", c: "#FFAB91" },
    Luteal:     { a: "#D81B60", b: "#7B1FA2", c: "#CE93D8" },
    Unknown:    { a: "#E8534A", b: "#EC407A", c: "#F48FB1" },
  };
  const c = phaseAccents[phase] ?? phaseAccents.Unknown!;

  return (
    <>
      {/* Top-left big bloom */}
      <div className="absolute" style={{ top: -14, left: -14, zIndex: 1 }}>
        <Flower size={80} petalColor={c.a} centerColor="#FFF3E0" petals={6} swayDuration={3.4} swayDelay={0} swayAmount={8} />
      </div>

      {/* Top-right bloom */}
      <div className="absolute" style={{ top: -10, right: -8, zIndex: 1 }}>
        <Flower size={68} petalColor={c.b} centerColor="#FCE4EC" petals={5} swayDuration={2.8} swayDelay={0.6} swayAmount={12} />
      </div>

      {/* Bottom-left */}
      <div className="absolute" style={{ bottom: -12, left: -6, zIndex: 1 }}>
        <Flower size={70} petalColor={c.c} centerColor="#FFF8E1" petals={5} swayDuration={3.2} swayDelay={0.3} swayAmount={9} />
      </div>

      {/* Bottom-right big bloom */}
      <div className="absolute" style={{ bottom: -14, right: -12, zIndex: 1 }}>
        <Flower size={82} petalColor={c.a} centerColor="#FCE4EC" petals={6} swayDuration={3.6} swayDelay={0.9} swayAmount={7} />
      </div>

      {/* Left mid small accent */}
      <div className="absolute" style={{ top: "38%", left: -18, zIndex: 1 }}>
        <Flower size={52} petalColor={c.b} centerColor="#FFF3E0" petals={5} swayDuration={2.6} swayDelay={1.1} swayAmount={14} />
      </div>

      {/* Right mid small accent */}
      <div className="absolute" style={{ top: "45%", right: -16, zIndex: 1 }}>
        <Flower size={56} petalColor={c.c} centerColor="#FCE4EC" petals={5} swayDuration={3.0} swayDelay={0.5} swayAmount={11} />
      </div>

      {/* Top-center small bud */}
      <div className="absolute" style={{ top: -6, left: "42%", zIndex: 1 }}>
        <Flower size={44} petalColor={c.b} centerColor="#FFF8E1" petals={4} swayDuration={2.4} swayDelay={1.4} swayAmount={15} />
      </div>

      {/* Bottom-center bud */}
      <div className="absolute" style={{ bottom: -4, left: "38%", zIndex: 1 }}>
        <Flower size={48} petalColor={c.a} centerColor="#FCE4EC" petals={4} swayDuration={2.8} swayDelay={0.8} swayAmount={10} />
      </div>
    </>
  );
}
