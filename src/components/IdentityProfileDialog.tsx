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
import { cn } from "@/lib/utils";
import {
  avatarForLevel,
  levelFromXp,
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

  // Past avatar — three levels behind, capped at 1 → contrast
  const pastLevel = Math.max(1, info.level - 5);
  const pastAvatar = avatarForLevel(pastLevel);
  const pastTitle = titleForLevel(pastLevel);

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
            className="grid h-24 w-24 place-items-center rounded-2xl text-5xl"
            style={{
              background: `${avatar.color}1f`,
              border: `2px solid ${avatar.color}`,
              boxShadow: `0 0 40px ${avatar.color}40`,
            }}
          >
            {avatar.emoji}
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

        {/* Past vs present comparison */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
            Você está virando outra pessoa
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div
              className="flex flex-col items-center rounded-md border border-border bg-surface-2 p-4"
              style={{ opacity: 0.6, filter: "saturate(0.4)" }}
            >
              <div className="text-[44px] grayscale">
                {pastAvatar.emoji}
              </div>
              <div className="mt-2 font-mono text-[9px] uppercase tracking-wider text-ink-mute">
                Antes (Nv. {pastLevel})
              </div>
              <div className="mt-0.5 text-[11px] text-ink-dim">{pastTitle}</div>
            </div>
            <div
              className="flex flex-col items-center rounded-md border p-4"
              style={{
                background: `${avatar.color}10`,
                borderColor: `${avatar.color}50`,
              }}
            >
              <div className="text-[44px]">{avatar.emoji}</div>
              <div
                className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: avatar.color }}
              >
                Hoje (Nv. {info.level})
              </div>
              <div className="mt-0.5 text-[11px] text-ink">{title}</div>
            </div>
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
