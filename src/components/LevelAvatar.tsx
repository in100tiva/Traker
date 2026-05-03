import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import {
  loreleiNeutral,
  notionistsNeutral,
  thumbs,
} from "@dicebear/collection";
import type { AvatarTier } from "@/lib/gamification";
import { cn } from "@/lib/utils";

/**
 * LevelAvatar — renders the DiceBear avatar for a given tier.
 *
 * Style is picked from the tier metadata. Background uses the tier color
 * (so the visual evolves both in shape AND palette across levels). The seed
 * is fixed per tier, so every user at level N sees the same "mascot" — that
 * shared recognition mirrors the design's "tier identity" message.
 *
 * The `locked` variant grays the avatar out — used for previewing the next
 * level the user hasn't reached yet.
 */

/**
 * DiceBear styles each declare their own `Options` generic, so a shared
 * registry can't be statically narrowed. Branching at call-time keeps the
 * call typed against the correct style.
 */
function buildAvatarSvg(
  styleName: AvatarTier["style"],
  seed: string,
  size: number,
): string {
  switch (styleName) {
    case "thumbs":
      return createAvatar(thumbs, {
        seed,
        size,
        backgroundColor: ["transparent"],
      }).toString();
    case "loreleiNeutral":
      return createAvatar(loreleiNeutral, {
        seed,
        size,
        backgroundColor: ["transparent"],
      }).toString();
    case "notionistsNeutral":
      return createAvatar(notionistsNeutral, {
        seed,
        size,
        backgroundColor: ["transparent"],
      }).toString();
  }
}

interface Props {
  tier: AvatarTier;
  size?: number;
  locked?: boolean;
  className?: string;
}

export function LevelAvatar({
  tier,
  size = 64,
  locked = false,
  className,
}: Props) {
  const svgMarkup = useMemo(
    () => buildAvatarSvg(tier.style, tier.seed, size),
    [tier.style, tier.seed, size],
  );

  return (
    <div
      className={cn(
        "grid place-items-center overflow-hidden rounded-2xl transition-all",
        locked && "grayscale",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: locked ? "rgba(255,255,255,0.04)" : `${tier.color}1f`,
        border: `2px solid ${locked ? "rgba(255,255,255,0.10)" : tier.color}`,
        boxShadow: locked ? "none" : `0 0 28px ${tier.color}40`,
        opacity: locked ? 0.55 : 1,
      }}
      aria-label={
        locked
          ? `Próximo tier — bloqueado`
          : `Avatar de tier nível ${tier.minLevel}`
      }
      // dicebear returns a self-contained <svg>; injecting is safe and the
      // markup is generated locally (not user-supplied).
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
