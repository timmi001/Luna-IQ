export const MOODS = [
  {
    emoji: "🌟",
    label: "Radiant",
    petalBase: "#FEF08A",
    petalMid: "#FDE047",
    petalTip: "#EAB308",
    petalHighlight: "#FEFCE8",
    centerInner: "#FFFBEB",
    centerOuter: "#F59E0B",
    textColor: "#92400E",
    bg: "#FEFCE8",
  },
  {
    emoji: "😄",
    label: "Happy",
    petalBase: "#FBCFE8",
    petalMid: "#F9A8D4",
    petalTip: "#EC4899",
    petalHighlight: "#FDF2F8",
    centerInner: "#FFF0F9",
    centerOuter: "#F472B6",
    textColor: "#831843",
    bg: "#FDF2F8",
  },
  {
    emoji: "😌",
    label: "Calm",
    petalBase: "#A7F3D0",
    petalMid: "#6EE7B7",
    petalTip: "#10B981",
    petalHighlight: "#F0FDF4",
    centerInner: "#ECFDF5",
    centerOuter: "#34D399",
    textColor: "#064E3B",
    bg: "#F0FDF4",
  },
  {
    emoji: "😴",
    label: "Tired",
    petalBase: "#DDD6FE",
    petalMid: "#C4B5FD",
    petalTip: "#7C3AED",
    petalHighlight: "#F5F3FF",
    centerInner: "#FAF5FF",
    centerOuter: "#A78BFA",
    textColor: "#3B0764",
    bg: "#F5F3FF",
  },
  {
    emoji: "😢",
    label: "Sad",
    petalBase: "#BFDBFE",
    petalMid: "#93C5FD",
    petalTip: "#2563EB",
    petalHighlight: "#EFF6FF",
    centerInner: "#EFF6FF",
    centerOuter: "#60A5FA",
    textColor: "#1E3A8A",
    bg: "#EFF6FF",
  },
  {
    emoji: "😰",
    label: "Anxious",
    petalBase: "#FECACA",
    petalMid: "#FCA5A5",
    petalTip: "#DC2626",
    petalHighlight: "#FEF2F2",
    centerInner: "#FFF5F5",
    centerOuter: "#F87171",
    textColor: "#7F1D1D",
    bg: "#FEF2F2",
  },
  {
    emoji: "😤",
    label: "Irritated",
    petalBase: "#FED7AA",
    petalMid: "#FDBA74",
    petalTip: "#EA580C",
    petalHighlight: "#FFF7ED",
    centerInner: "#FFFBEB",
    centerOuter: "#FB923C",
    textColor: "#7C2D12",
    bg: "#FFF7ED",
  },
];

export type MoodDef = (typeof MOODS)[number];

const outerPetal =
  "M 0,12 C -14,12 -26,0 -25,-18 C -24,-34 -13,-47 0,-49 C 13,-47 24,-34 25,-18 C 26,0 14,12 0,12";
const innerPetal =
  "M 0,8 C -9,8 -17,0 -16,-13 C -15,-25 -8,-33 0,-34 C 8,-33 15,-25 16,-13 C 17,0 9,8 0,8";

export function MoodFlower({
  mood,
  isSelected = false,
  size = 76,
  emojiSize,
}: {
  mood: MoodDef;
  isSelected?: boolean;
  size?: number;
  emojiSize?: number;
}) {
  const id = `mf-${mood.label}`;
  const op = isSelected ? 1 : 0.75;
  const eSize = emojiSize ?? (isSelected ? 38 : 32);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="-54 -52 108 108"
        width={size}
        height={size}
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`pg-${id}`} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor={mood.petalHighlight} stopOpacity="0.95" />
            <stop offset="35%"  stopColor={mood.petalBase} />
            <stop offset="70%"  stopColor={mood.petalMid} />
            <stop offset="100%" stopColor={mood.petalTip} />
          </linearGradient>

          <linearGradient id={`ig-${id}`} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor={mood.petalBase} stopOpacity="0.9" />
            <stop offset="50%"  stopColor={mood.petalMid} />
            <stop offset="100%" stopColor={mood.petalTip} />
          </linearGradient>

          <radialGradient id={`cg-${id}`} cx="38%" cy="35%" r="65%">
            <stop offset="0%"   stopColor={mood.centerInner} />
            <stop offset="55%"  stopColor={mood.centerOuter} stopOpacity="0.85" />
            <stop offset="100%" stopColor={mood.petalTip}    stopOpacity="0.55" />
          </radialGradient>

          <filter id={`f-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5"
              floodColor={mood.petalTip}
              floodOpacity={isSelected ? 0.40 : 0.18} />
          </filter>
        </defs>

        <g opacity={op} filter={`url(#f-${id})`}>
          {[0, 72, 144, 216, 288].map((angle) => (
            <g key={`o${angle}`} transform={`rotate(${angle})`}>
              <path d={outerPetal} fill={`url(#pg-${id})`} />
              <path d={outerPetal} fill={mood.petalTip} opacity="0.12" />
              <path d="M 0,10 Q 0,-18 0,-48"
                fill="none" stroke={mood.petalTip}
                strokeWidth="0.8" strokeOpacity="0.25" strokeLinecap="round" />
              <path d="M -10,8 Q -15,-10 -12,-40"
                fill="none" stroke="white"
                strokeWidth="1.3" strokeOpacity="0.40" strokeLinecap="round" />
            </g>
          ))}

          {[36, 108, 180, 252, 324].map((angle) => (
            <g key={`i${angle}`} transform={`rotate(${angle})`}>
              <path d={innerPetal} fill={`url(#ig-${id})`} />
              <path d="M 0,7 Q 0,-12 0,-33"
                fill="none" stroke={mood.petalTip}
                strokeWidth="0.7" strokeOpacity="0.20" strokeLinecap="round" />
            </g>
          ))}

          <circle cx="0" cy="0" r="18" fill={`url(#cg-${id})`} />
          <circle cx="0" cy="0" r="18" fill="none"
            stroke={mood.petalTip} strokeWidth="1" strokeOpacity="0.25" />
          <circle cx="-5" cy="-5" r="5.5" fill="white" opacity="0.30" />

          {isSelected && (
            <circle cx="0" cy="0" r="19.5" fill="none"
              stroke={mood.petalTip} strokeWidth="2.2" strokeOpacity="0.65" />
          )}
        </g>
      </svg>

      <span
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none"
        style={{
          fontSize: eSize,
          lineHeight: 1,
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.18))",
        }}
      >
        {mood.emoji}
      </span>
    </div>
  );
}
