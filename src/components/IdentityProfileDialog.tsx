import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HIcon } from "./icons/HIcon";
import { LevelAvatar } from "./LevelAvatar";
import { cn } from "@/lib/utils";
import {
  LEVEL_THRESHOLDS,
  avatarForLevel,
  levelFromXp,
  nextAvatarTier,
  nextTitleForLevel,
  titleForLevel,
} from "@/lib/gamification";
import type { Habit } from "@/db/schema";
import type { DbBundle } from "@/db/client";
import { calculateCurrentStreak, calculateLongestStreak } from "@/lib/streak";
import { ALL_DAYS_SCHEDULE } from "@/lib/schedule";
import { todayKey } from "@/lib/date";
import { getRecentXp } from "@/db/queries";

/**
 * IdentityProfileDialog — reinforces who the user is becoming, not just
 * what they do. Avatar evolves with level, identity title is shown big,
 * and the user sees a "you 30 days ago vs you today" visual contrast.
 *
 * Identity sentences pull from the user's most-streaked active habit:
 *  > Você é uma pessoa que medita há 47 dias.
 *
 * Opens via click on the LevelBadge in the topbar.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle: DbBundle | null;
  habits: Habit[];
  totalXp: number;
}

interface HabitStreak {
  habit: Habit;
  current: number;
  longest: number;
}

interface DropEntry {
  id: string;
  amount: number;
  createdAt: Date | string;
  rarity: "common" | "rare" | "epic" | "unknown";
}

const DROP_AVATAR: Record<DropEntry["rarity"], string> = {
  common: "✨",
  rare: "💎",
  epic: "👑",
  unknown: "🎁",
};

const DROP_LABEL: Record<DropEntry["rarity"], string> = {
  common: "Drop comum",
  rare: "Drop raro",
  epic: "Drop épico",
  unknown: "Drop",
};

export function IdentityProfileDialog({
  open,
  onOpenChange,
  bundle,
  habits,
  totalXp,
}: Props) {
  const info = levelFromXp(totalXp);
  const avatar = avatarForLevel(info.level);
  const title = titleForLevel(info.level);

  // Compute streaks per habit when the dialog opens
  const [streaks, setStreaks] = useState<HabitStreak[]>([]);
  const [drops, setDrops] = useState<DropEntry[]>([]);
  useEffect(() => {
    if (!open || !bundle || habits.length === 0) return;
    let cancelled = false;
    (async () => {
      const today = todayKey();
      const out: HabitStreak[] = [];
      for (const h of habits.filter((x) => !x.archivedAt)) {
        const { rows } = await bundle.pg.query<{ date: string }>(
          `SELECT date::text AS date FROM completions
             WHERE habit_id = $1 ORDER BY date ASC LIMIT 2000`,
          [h.id],
        );
        const dates = rows.map((r) => r.date);
        const sch = h.schedule ?? ALL_DAYS_SCHEDULE;
        out.push({
          habit: h,
          current: calculateCurrentStreak(dates, today, sch),
          longest: calculateLongestStreak(dates, sch),
        });
      }
      if (!cancelled) setStreaks(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, bundle, habits]);

  // Load drop history (variable rewards) when dialog opens
  useEffect(() => {
    if (!open || !bundle) return;
    let cancelled = false;
    (async () => {
      const rows = await getRecentXp(bundle.db, 100);
      const dropRows = rows
        .filter((r) => r.kind === "drop")
        .map<DropEntry>((r) => {
          const p = r.payload as { rarity?: string } | null;
          const rarity =
            p?.rarity === "common" || p?.rarity === "rare" || p?.rarity === "epic"
              ? p.rarity
              : "unknown";
          return {
            id: r.id,
            amount: r.amount,
            createdAt: r.createdAt,
            rarity,
          };
        });
      if (!cancelled) setDrops(dropRows);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, bundle]);

  // Pick the best streak for the identity sentence
  const champion = useMemo(() => {
    if (streaks.length === 0) return null;
    let best = streaks[0];
    for (const s of streaks) {
      if (s.current > best.current) best = s;
    }
    return best;
  }, [streaks]);

  // Next tier — preview of what you're working toward.
  const nextTier = useMemo(() => nextAvatarTier(info.level), [info.level]);
  const nextTitle = useMemo(
    () => nextTitleForLevel(info.level),
    [info.level],
  );
  // XP gap from current total to the floor of the next tier (not next level).
  const xpToNextTier = useMemo(() => {
    if (!nextTier) return 0;
    const tierFloorXp = LEVEL_THRESHOLDS[nextTier.minLevel - 1] ?? 0;
    return Math.max(0, tierFloorXp - totalXp);
  }, [nextTier, totalXp]);

  const totalChecks = useMemo(
    () => streaks.reduce((s, x) => s + (x.longest > 0 ? x.longest : 0), 0),
    [streaks],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Seu perfil</DialogTitle>
          <DialogDescription className="sr-only">
            Identidade e progresso
          </DialogDescription>
        </DialogHeader>

        {/* Hero avatar */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <LevelAvatar tier={avatar} size={96} />
          </motion.div>

          <div className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
            Nv. {info.level}
          </div>
          <div className="font-display text-[26px] font-bold leading-tight tracking-tightest text-ink">
            Você é uma pessoa{" "}
            <span style={{ color: avatar.color }}>{title}</span>
          </div>
        </div>

        {/* Identity sentence */}
        {champion && champion.current > 0 && (
          <div className="rounded-md border border-border bg-bg p-4 text-center">
            <p className="text-[14px] leading-[1.5] text-ink-dim">
              <span className="text-ink">
                Você é uma pessoa que{" "}
                <span className="font-semibold">
                  {champion.habit.name.toLowerCase()}
                </span>{" "}
                há{" "}
              </span>
              <span
                className="font-display font-bold tracking-tighter text-ink"
                style={{ fontSize: 24 }}
              >
                <CountUp end={champion.current} duration={0.8} preserveValue />
              </span>{" "}
              <span className="text-ink-dim">
                {champion.current === 1 ? "dia" : "dias"}.
              </span>
            </p>
          </div>
        )}

        {/* Hoje vs próximo tier */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
            {nextTier
              ? "Você está virando outra pessoa"
              : "Você atingiu o tier final"}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="flex flex-col items-center rounded-md border p-4"
              style={{
                background: `${avatar.color}10`,
                borderColor: `${avatar.color}50`,
              }}
            >
              <LevelAvatar tier={avatar} size={64} />
              <div
                className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: avatar.color }}
              >
                Hoje (Nv. {info.level})
              </div>
              <div className="mt-0.5 text-[11px] text-ink">{title}</div>
            </div>
            {nextTier ? (
              <div className="relative flex flex-col items-center rounded-md border border-dashed border-border bg-surface-2 p-4">
                <LevelAvatar tier={nextTier} size={64} locked />
                <div className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-bg/80 text-ink-mute backdrop-blur">
                  <HIcon name="archive" size={10} />
                </div>
                <div className="mt-2 font-mono text-[9px] uppercase tracking-wider text-ink-mute">
                  Próximo (Nv. {nextTier.minLevel})
                </div>
                <div className="mt-0.5 text-[11px] text-ink-dim">
                  {nextTitle}
                </div>
                {xpToNextTier > 0 && (
                  <div
                    className="mt-1.5 font-mono text-[9.5px]"
                    style={{ color: nextTier.color }}
                  >
                    faltam {xpToNextTier.toLocaleString("pt-BR")} XP
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface-2 p-4 text-center">
                <div className="text-[28px]">🏁</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                  Tier máximo
                </div>
                <div className="mt-0.5 text-[11px] text-ink-dim">
                  Continue marcando — XP infinito
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <ProfileStat
            label="XP total"
            value={
              <CountUp end={totalXp} duration={0.6} preserveValue />
            }
          />
          <ProfileStat
            label="Maior streak"
            value={
              <CountUp
                end={Math.max(...streaks.map((s) => s.longest), 0)}
                duration={0.6}
                preserveValue
              />
            }
          />
          <ProfileStat
            label="Hábitos ativos"
            value={
              <CountUp
                end={streaks.length}
                duration={0.6}
                preserveValue
              />
            }
          />
        </div>

        {/* XP toward next level */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-mute">
            <span>Progresso até Nv. {info.level + 1}</span>
            <span className="tabular-nums">
              {info.xpInto}/{info.xpForNext} XP
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-pill bg-surface-3">
            <motion.div
              className="h-full"
              style={{ background: avatar.color }}
              initial={{ width: 0 }}
              animate={{ width: `${info.pct * 100}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Drop history — variable rewards received */}
        {drops.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-mute">
              <span>Drops recebidos</span>
              <span className="tabular-nums">
                {drops.length} {drops.length === 1 ? "item" : "itens"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto rounded-md border border-border bg-bg p-2">
              {drops.slice(0, 12).map((d) => (
                <div
                  key={d.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-sm px-2 py-1.5",
                    d.rarity === "epic" && "bg-accent/5",
                  )}
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-2 text-base">
                    {DROP_AVATAR[d.rarity]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[12px] font-semibold tracking-tighter text-ink">
                      {DROP_LABEL[d.rarity]}
                    </div>
                    <div className="font-mono text-[9.5px] text-ink-mute">
                      {new Date(d.createdAt).toLocaleString("pt-BR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="font-mono text-[11px] font-semibold tabular-nums text-accent">
                    +{d.amount} XP
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        {totalChecks > 0 && (
          <div className="text-center font-mono text-[10.5px] text-ink-dim">
            <HIcon name="flame" size={12} className="mr-1 inline-block" />
            Você acumulou {totalChecks} dias dentro de sequências.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-md border border-border bg-surface-2 p-3 text-center")}>
      <div className="font-display text-[20px] font-bold leading-none tracking-tighter text-ink tabular-nums">
        {value}
      </div>
      <div className="mt-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-mute">
        {label}
      </div>
    </div>
  );
}
