export const MOODS = [
  { emoji: "🤩", label: "Joyful",     bg: "#FFF9C4", textColor: "#7B5E00" },
  { emoji: "😊", label: "Confident",  bg: "#FFE0B2", textColor: "#7C3D00" },
  { emoji: "😌", label: "Calm",       bg: "#C8F7E4", textColor: "#065F46" },
  { emoji: "😰", label: "Anxious",    bg: "#DBEAFE", textColor: "#1E3A8A" },
  { emoji: "🤔", label: "Reflective", bg: "#EDE9FE", textColor: "#4C1D95" },
  { emoji: "😔", label: "Low",        bg: "#E2E8F0", textColor: "#334155" },
  { emoji: "😫", label: "Stressed",   bg: "#FFE4E6", textColor: "#9F1239" },
];

export type MoodDef = (typeof MOODS)[number];

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
  const eSize = emojiSize ?? (isSelected ? 38 : 32);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: mood.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: isSelected ? `2.5px solid ${mood.textColor}50` : "2px solid transparent",
        boxShadow: isSelected
          ? `0 0 0 3px ${mood.bg}, 0 0 0 5.5px ${mood.textColor}35, 0 4px 12px ${mood.textColor}20`
          : "0 2px 8px rgba(0,0,0,0.09)",
        transition: "box-shadow 0.2s, border-color 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: eSize,
          lineHeight: 1,
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.14))",
          userSelect: "none",
        }}
      >
        {mood.emoji}
      </span>
    </div>
  );
}
