import { HIcon, type IconName } from "./icons/HIcon";

interface Props {
  /** Icon name from HIcon set (optional — prefer emoji if supplied) */
  iconName?: IconName;
  /** Emoji takes priority when present */
  emoji?: string | null;
  size?: number;
  /** Yellow-accent variant (for the detail panel hero) */
  accent?: boolean;
  /** Override background color (overrides accent) */
  bg?: string;
  className?: string;
}

export function IconTile({
  iconName,
  emoji,
  size = 40,
  accent = false,
  bg,
  className,
}: Props) {
  const radius = size * 0.3;
  const content = emoji ? (
    <span style={{ fontSize: size * 0.58, lineHeight: 1 }}>{emoji}</span>
  ) : iconName ? (
    <HIcon name={iconName} size={size * 0.52} />
  ) : null;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background:
          bg ?? (accent ? "rgb(var(--accent))" : "rgb(var(--surface-3))"),
        color: accent ? "rgb(10, 10, 10)" : "rgb(var(--text))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {content}
    </div>
  );
}
