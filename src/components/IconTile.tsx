import { HIcon, type IconName } from "./icons/HIcon";

/**
 * The habit's `emoji` field holds either a literal emoji character (legacy)
 * or an icon-name token prefixed with `i:` (e.g. `i:flame`) when the user
 * picks from the Hugeicons grid. `parseGlyph` lets every render site treat
 * both shapes uniformly.
 */
export function parseGlyph(
  emoji?: string | null,
): { kind: "icon"; name: IconName } | { kind: "emoji"; value: string } | null {
  if (!emoji) return null;
  if (emoji.startsWith("i:")) {
    return { kind: "icon", name: emoji.slice(2) as IconName };
  }
  return { kind: "emoji", value: emoji };
}

export const ICON_GLYPH_PREFIX = "i:";

interface Props {
  /** Icon name from HIcon set (optional — used when no `emoji` is supplied) */
  iconName?: IconName;
  /** Emoji char or `i:<icon>` token (preferred when present) */
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
  const parsed = parseGlyph(emoji);
  const content =
    parsed?.kind === "emoji" ? (
      <span style={{ fontSize: size * 0.58, lineHeight: 1 }}>{parsed.value}</span>
    ) : parsed?.kind === "icon" ? (
      <HIcon name={parsed.name} size={size * 0.52} />
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
