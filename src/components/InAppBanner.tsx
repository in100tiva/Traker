import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { HIcon, type IconName } from "./icons/HIcon";
import { cn } from "@/lib/utils";

/**
 * In-app banner — emotional, dismissible message at the top of the
 * content area. Different "tones" map to different palettes/icons.
 *
 * Used by:
 *  - Re-engagement flow (Fase 3) when bootstrap.daysAway is high
 *  - Reminder hour learned by notifications-engine
 *  - Fase 4: feature flag teasers, comeback rewards
 */

export type BannerTone =
  | "welcome_back"
  | "we_miss_you"
  | "comeback"
  | "gentle_nudge"
  | "tip"
  | "celebration";

interface Props {
  tone?: BannerTone;
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
  onDismiss?: () => void;
  /** Persist dismissal under this key in sessionStorage (per-tab). */
  dismissKey?: string;
}

const TONES: Record<
  BannerTone,
  {
    icon: IconName;
    color: string;
    border: string;
    bg: string;
    iconBg: string;
  }
> = {
  welcome_back: {
    icon: "sparkles",
    color: "rgb(168, 85, 247)",
    border: "rgba(168, 85, 247, 0.35)",
    bg: "rgba(168, 85, 247, 0.08)",
    iconBg: "rgba(168, 85, 247, 0.15)",
  },
  we_miss_you: {
    icon: "bell",
    color: "rgb(232, 121, 249)",
    border: "rgba(232, 121, 249, 0.35)",
    bg: "rgba(232, 121, 249, 0.08)",
    iconBg: "rgba(232, 121, 249, 0.15)",
  },
  comeback: {
    icon: "flame",
    color: "rgb(249, 115, 22)",
    border: "rgba(249, 115, 22, 0.35)",
    bg: "rgba(249, 115, 22, 0.08)",
    iconBg: "rgba(249, 115, 22, 0.15)",
  },
  gentle_nudge: {
    icon: "sun",
    color: "rgb(250, 204, 21)",
    border: "rgba(250, 204, 21, 0.35)",
    bg: "rgba(250, 204, 21, 0.08)",
    iconBg: "rgba(250, 204, 21, 0.15)",
  },
  tip: {
    icon: "sparkles",
    color: "rgb(var(--accent))",
    border: "rgba(232, 255, 58, 0.3)",
    bg: "rgba(232, 255, 58, 0.06)",
    iconBg: "rgba(232, 255, 58, 0.12)",
  },
  celebration: {
    icon: "trophy",
    color: "rgb(232, 255, 58)",
    border: "rgba(232, 255, 58, 0.4)",
    bg: "rgba(232, 255, 58, 0.08)",
    iconBg: "rgba(232, 255, 58, 0.18)",
  },
};

export function InAppBanner({
  tone = "tip",
  title,
  body,
  ctaLabel,
  onCta,
  onDismiss,
  dismissKey,
}: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined" || !dismissKey) return false;
    try {
      return window.sessionStorage.getItem(dismissKey) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;
  const palette = TONES[tone];

  function handleDismiss() {
    if (dismissKey) {
      try {
        window.sessionStorage.setItem(dismissKey, "1");
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(
          "flex items-start gap-3 rounded-lg border p-3.5",
        )}
        style={{
          background: palette.bg,
          borderColor: palette.border,
          color: "rgb(var(--text))",
        }}
      >
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md"
          style={{ background: palette.iconBg, color: palette.color }}
        >
          <HIcon name={palette.icon} size={16} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[14px] font-semibold leading-tight tracking-tighter text-ink">
            {title}
          </div>
          {body && (
            <div className="mt-1 text-[12.5px] leading-[1.45] text-ink-dim">
              {body}
            </div>
          )}
          {ctaLabel && onCta && (
            <button
              type="button"
              onClick={onCta}
              className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wide hover:underline"
              style={{ color: palette.color }}
            >
              {ctaLabel}
              <HIcon name="chevron-right" size={12} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-sm text-ink-mute hover:bg-surface-2 hover:text-ink"
        >
          <HIcon name="x" size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
