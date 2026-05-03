import { HIcon } from "./icons/HIcon";
import { parseGlyph } from "./IconTile";

/**
 * Inline renderer for a habit's `emoji` value when there's no IconTile
 * wrapper. Detects the `i:<icon>` prefix and renders the corresponding
 * Hugeicon, or falls back to the literal emoji text.
 */

interface Props {
  emoji?: string | null;
  size?: number;
  className?: string;
  /** Shown when no emoji is set. Defaults to "•". */
  fallback?: string;
}

export function HabitGlyph({
  emoji,
  size = 18,
  className,
  fallback = "•",
}: Props) {
  const parsed = parseGlyph(emoji);
  if (parsed?.kind === "icon") {
    return <HIcon name={parsed.name} size={size} className={className} />;
  }
  if (parsed?.kind === "emoji") {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1 }}>
        {parsed.value}
      </span>
    );
  }
  return (
    <span className={className} style={{ fontSize: size, lineHeight: 1 }}>
      {fallback}
    </span>
  );
}
