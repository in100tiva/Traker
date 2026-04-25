import CountUp from "react-countup";
import { motion } from "framer-motion";
import {
  avatarForLevel,
  levelFromXp,
  titleForLevel,
} from "@/lib/gamification";
import { cn } from "@/lib/utils";

interface Props {
  totalXp: number;
  className?: string;
  /** Compact mode for tight spaces (sidebar collapsed, mobile header). */
  compact?: boolean;
}

export function LevelBadge({ totalXp, className, compact }: Props) {
  const info = levelFromXp(totalXp);
  const avatar = avatarForLevel(info.level);
  const title = titleForLevel(info.level);

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface-2 px-2 py-1",
          className,
        )}
      >
        <span style={{ fontSize: 16 }}>{avatar.emoji}</span>
        <span className="font-mono text-[10px] font-semibold tabular-nums text-ink">
          Nv. {info.level}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-bg p-3.5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-[22px]"
          style={{
            background: `${avatar.color}22`,
            border: `1.5px solid ${avatar.color}`,
          }}
        >
          {avatar.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[18px] font-bold leading-none tracking-tighter text-ink">
              Nv. {info.level}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
              {title}
            </span>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-3"
            aria-label={`${info.xpInto} de ${info.xpForNext} XP`}
          >
            <motion.div
              className="h-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${info.pct * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-ink-dim tabular-nums">
            <span>
              <CountUp end={info.xpInto} duration={0.6} preserveValue />/
              {info.xpForNext} XP
            </span>
            <span>
              <CountUp end={totalXp} duration={0.6} preserveValue /> total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
