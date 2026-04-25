import { motion } from "framer-motion";
import CountUp from "react-countup";
import { cn } from "@/lib/utils";

/**
 * StreakFlame — emotional, big-number display of the user's current streak.
 *
 * Visual scaling:
 * - 0   : muted grey (haven't started)
 * - 1-2 : warm yellow
 * - 3-6 : amber
 * - 7-29: orange (default "fire" tier)
 * - 30+ : red
 * - 100+: fuchsia (rare/legendary)
 *
 * Loss-aversion cue: when streak >= 1 and the day isn't yet marked we show
 * a subtle "no quebra hoje" line — drives the user to act.
 */

interface Props {
  streak: number;
  /** Subtitle line; usually the habit name. */
  habitName?: string;
  /** True when today's check is missing — triggers the loss-aversion line. */
  unmarkedToday?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_PRESETS = {
  sm: { number: 36, flame: 20, gap: 6 },
  md: { number: 48, flame: 26, gap: 8 },
  lg: { number: 72, flame: 36, gap: 10 },
  xl: { number: 96, flame: 48, gap: 12 },
} as const;

export interface FlameTier {
  min: number;
  color: string; // hex
  ringColor: string; // rgba
  glow: string;
  label: string;
}

export const FLAME_TIERS: FlameTier[] = [
  { min: 0, color: "rgb(var(--text-mute))", ringColor: "rgba(255,255,255,0.06)", glow: "none", label: "Pronto pra começar" },
  { min: 1, color: "#facc15", ringColor: "rgba(250,204,21,0.25)", glow: "0 0 24px rgba(250,204,21,0.35)", label: "Acendendo" },
  { min: 3, color: "#f59e0b", ringColor: "rgba(245,158,11,0.28)", glow: "0 0 28px rgba(245,158,11,0.4)", label: "Pegando ritmo" },
  { min: 7, color: "#f97316", ringColor: "rgba(249,115,22,0.32)", glow: "0 0 32px rgba(249,115,22,0.45)", label: "Em chamas" },
  { min: 14, color: "#ef4444", ringColor: "rgba(239,68,68,0.36)", glow: "0 0 36px rgba(239,68,68,0.5)", label: "Inabalável" },
  { min: 30, color: "#dc2626", ringColor: "rgba(220,38,38,0.4)", glow: "0 0 40px rgba(220,38,38,0.55)", label: "Lendário" },
  { min: 100, color: "#d946ef", ringColor: "rgba(217,70,239,0.42)", glow: "0 0 44px rgba(217,70,239,0.6)", label: "Mítico" },
  { min: 365, color: "#a855f7", ringColor: "rgba(168,85,247,0.45)", glow: "0 0 50px rgba(168,85,247,0.7)", label: "Eterno" },
];

export function tierForStreak(streak: number): FlameTier {
  let chosen = FLAME_TIERS[0];
  for (const t of FLAME_TIERS) {
    if (streak >= t.min) chosen = t;
  }
  return chosen;
}

export function StreakFlame({
  streak,
  habitName,
  unmarkedToday,
  size = "lg",
  className,
}: Props) {
  const tier = tierForStreak(streak);
  const s = SIZE_PRESETS[size];
  const isHot = streak >= 1;

  return (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <div
        className="relative inline-flex items-center"
        style={{ gap: s.gap, color: tier.color }}
      >
        {/* Glow halo behind the flame */}
        {isHot && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-0 rounded-full"
            style={{ background: tier.color, filter: "blur(28px)", opacity: 0.18 }}
            animate={{ opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <motion.svg
          aria-hidden
          viewBox="0 0 24 24"
          width={s.flame}
          height={s.flame}
          fill="currentColor"
          stroke="none"
          animate={
            isHot
              ? {
                  scale: [1, 1.12, 1],
                  rotate: [-1.5, 1.5, -1.5],
                  filter: [
                    `drop-shadow(0 0 6px ${tier.color})`,
                    `drop-shadow(0 0 14px ${tier.color})`,
                    `drop-shadow(0 0 6px ${tier.color})`,
                  ],
                }
              : { scale: 1, rotate: 0, filter: "none" }
          }
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M12 2c.7 1.5 1.6 3 3 4 2 1.5 3 3.5 3 6a6 6 0 0 1-12 0c0-1.6.6-3 1.6-4 .8.8 1.4.6 2-.4.8-1.4.4-3 2.4-5.6zm-1 12.5c.5-1.2 1.6-2.2 1.6-3.6 1 1.2 2.4 2 2.4 3.4a2.5 2.5 0 1 1-5 .2c0-.4 0-.4 1-.0z" />
        </motion.svg>

        <span
          className="font-display font-bold leading-none tracking-tightest font-tabular"
          style={{ fontSize: s.number, color: tier.color }}
        >
          <CountUp
            end={streak}
            duration={0.8}
            preserveValue
            useEasing
          />
        </span>
      </div>

      <div className="mt-2.5 text-center">
        <div
          className="font-mono text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: tier.color }}
        >
          {streak === 0 ? tier.label : `${tier.label} · ${streak} dias`}
        </div>
        {habitName && (
          <div className="mt-0.5 font-display text-[15px] font-semibold tracking-tighter text-ink">
            {habitName}
          </div>
        )}
        {unmarkedToday && streak > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-warning/40 bg-warning/5 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-warning">
            ⚠ não quebra hoje
          </div>
        )}
      </div>
    </div>
  );
}
