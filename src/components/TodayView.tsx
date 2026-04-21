import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Pause, Pencil, Plus, Minus } from "lucide-react";
import type { DbBundle } from "@/db/client";
import type { Habit } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedCheckbox } from "./AnimatedCheckbox";
import { ProgressRing } from "./ProgressRing";
import { Greeting } from "./Greeting";
import { cn } from "@/lib/utils";
import { todayKey } from "@/lib/date";
import { haptics } from "@/lib/haptics";

interface StreakMap {
  [habitId: string]: number;
}

interface CompletionToday {
  count: number;
  note: string | null;
}

interface Props {
  bundle: DbBundle | null;
  habits: Habit[];
  loading?: boolean;
  onToggle: (habitId: string, date: Date) => Promise<void>;
  onIncrement: (habitId: string, delta: number) => Promise<void>;
  onSelectHabit: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onOpenCreate: () => void;
}

export function TodayView({
  bundle,
  habits,
  loading,
  onToggle,
  onIncrement,
  onSelectHabit,
  onEdit,
  onOpenCreate,
}: Props) {
  const today = todayKey();
  const [todayMap, setTodayMap] = useState<Map<string, CompletionToday>>(
    new Map(),
  );
  const [streaks, setStreaks] = useState<StreakMap>({});

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    let unsub: (() => void) | null = null;
    bundle.pg.live
      .query<{ habit_id: string; count: number; note: string | null }>(
        `SELECT habit_id, count, note FROM completions WHERE date = $1`,
        [today],
        (res) => {
          if (cancelled) return;
          const map = new Map<string, CompletionToday>();
          for (const r of res.rows)
            map.set(r.habit_id, { count: r.count, note: r.note });
          setTodayMap(map);
        },
      )
      .then((sub) => {
        if (cancelled) sub.unsubscribe();
        else unsub = sub.unsubscribe;
      });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [bundle, today]);

  // Compute streaks per habit via a single SQL query (last completion + gap check is complex — we fetch recent dates per habit).
  useEffect(() => {
    if (!bundle || habits.length === 0) return;
    let cancelled = false;
    (async () => {
      const map: StreakMap = {};
      for (const h of habits) {
        const { rows } = await bundle.pg.query<{ date: string }>(
          `SELECT date::text AS date FROM completions
           WHERE habit_id = $1 AND date > $2
           ORDER BY date DESC LIMIT 500`,
          [h.id, addDaysISO(today, -400)],
        );
        map[h.id] = computeStreakFromDates(rows.map((r) => r.date), today);
      }
      if (!cancelled) setStreaks(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [bundle, habits, todayMap, today]);

  const active = useMemo(
    () => habits.filter((h) => !h.archivedAt && !h.pausedAt),
    [habits],
  );
  const paused = useMemo(
    () => habits.filter((h) => !h.archivedAt && h.pausedAt),
    [habits],
  );
  const doneCount = active.filter((h) => todayMap.has(h.id)).length;
  const total = active.length;
  const pct = total === 0 ? 0 : doneCount / total;

  // Group active habits by tag
  const groupedActive = useMemo(() => {
    const groups = new Map<string, Habit[]>();
    for (const h of active) {
      const key = h.tag ?? "_untagged";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(h);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "_untagged") return 1;
      if (b === "_untagged") return -1;
      return a.localeCompare(b);
    });
  }, [active]);

  if (loading && habits.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card elevated className="overflow-hidden">
        <CardContent className="flex items-center gap-6 p-6">
          <ProgressRing
            value={pct}
            size={124}
            stroke={12}
            label={
              total === 0
                ? "vazio"
                : doneCount === total
                  ? "feito!"
                  : `${doneCount}/${total}`
            }
            sublabel="hoje"
          />
          <div className="flex-1">
            <Greeting pendingCount={total - doneCount} totalCount={total} />
            {total === 0 && (
              <Button size="sm" className="mt-3" onClick={onOpenCreate}>
                <Plus className="h-4 w-4" />
                Criar primeiro hábito
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {active.length === 0 && total === 0 ? (
        <EmptyIllustration onCreate={onOpenCreate} />
      ) : (
        <>
          {groupedActive.map(([key, list]) => (
            <TagGroup
              key={key}
              title={key === "_untagged" ? null : key}
              habits={list}
              todayMap={todayMap}
              streaks={streaks}
              onToggle={async (id, d) => {
                haptics.tap();
                await onToggle(id, d);
              }}
              onIncrement={onIncrement}
              onSelect={onSelectHabit}
              onEdit={onEdit}
            />
          ))}

          {paused.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Pause className="h-3 w-3" /> Pausados
              </div>
              <ul className="space-y-2 opacity-60">
                {paused.map((h) => (
                  <HabitRow
                    key={h.id}
                    habit={h}
                    todayEntry={todayMap.get(h.id)}
                    streak={streaks[h.id] ?? 0}
                    onToggle={() => {}}
                    onIncrement={() => {}}
                    onSelect={() => onSelectHabit(h.id)}
                    onEdit={() => onEdit(h)}
                    disabled
                  />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TagGroup({
  title,
  habits,
  todayMap,
  streaks,
  onToggle,
  onIncrement,
  onSelect,
  onEdit,
}: {
  title: string | null;
  habits: Habit[];
  todayMap: Map<string, CompletionToday>;
  streaks: StreakMap;
  onToggle: (id: string, d: Date) => Promise<void>;
  onIncrement: (id: string, delta: number) => Promise<void>;
  onSelect: (id: string) => void;
  onEdit: (h: Habit) => void;
}) {
  const done = habits.filter((h) => todayMap.has(h.id)).length;
  return (
    <div>
      {title && (
        <div className="mb-2 flex items-center justify-between px-1">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            #{title}
          </div>
          <div className="text-xs tabular-nums text-muted-foreground">
            {done}/{habits.length}
          </div>
        </div>
      )}
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {habits.map((habit) => (
            <motion.li
              key={habit.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <HabitRow
                habit={habit}
                todayEntry={todayMap.get(habit.id)}
                streak={streaks[habit.id] ?? 0}
                onToggle={() => onToggle(habit.id, new Date())}
                onIncrement={(d) => onIncrement(habit.id, d)}
                onSelect={() => onSelect(habit.id)}
                onEdit={() => onEdit(habit)}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function HabitRow({
  habit,
  todayEntry,
  streak,
  onToggle,
  onIncrement,
  onSelect,
  onEdit,
  disabled,
}: {
  habit: Habit;
  todayEntry: CompletionToday | undefined;
  streak: number;
  onToggle: () => void;
  onIncrement: (delta: number) => void;
  onSelect: () => void;
  onEdit: () => void;
  disabled?: boolean;
}) {
  const done = Boolean(todayEntry);
  const count = todayEntry?.count ?? 0;
  const quantitative =
    habit.targetPerDay !== null && habit.targetPerDay !== undefined;
  const dayProgress =
    quantitative && habit.targetPerDay
      ? Math.min(1, count / habit.targetPerDay)
      : null;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-3 shadow-card transition-all duration-200",
        done && "border-primary/30",
        !disabled && "hover:-translate-y-px hover:border-foreground/20 hover:shadow-elevated",
      )}
      style={{
        backgroundImage: done
          ? `linear-gradient(90deg, ${habit.color}10, transparent 40%)`
          : undefined,
      }}
    >
      <AnimatedCheckbox
        checked={done}
        color={habit.color}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onToggle();
        }}
        aria-label={done ? `Desmarcar ${habit.name}` : `Marcar ${habit.name}`}
      />
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col items-start overflow-hidden text-left"
      >
        <div className="flex w-full items-center gap-2">
          <span
            className={cn(
              "truncate font-medium",
              done && "text-muted-foreground line-through decoration-1",
            )}
          >
            {habit.name}
          </span>
          {streak > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground"
              title={`Sequência de ${streak} dias`}
            >
              <Flame
                className={cn(
                  "h-3 w-3",
                  streak >= 7 ? "text-orange-500" : "text-amber-500",
                )}
              />
              {streak}d
            </span>
          )}
          {habit.isNegative && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              abst
            </span>
          )}
        </div>
        {habit.description && (
          <span className="truncate text-xs text-muted-foreground">
            {habit.description}
          </span>
        )}
        {dayProgress !== null && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full"
              style={{ backgroundColor: habit.color }}
              initial={{ width: 0 }}
              animate={{ width: `${dayProgress * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        )}
      </button>
      <div className="flex items-center gap-1">
        {done && quantitative && (
          <>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => onIncrement(-1)}
              aria-label="Diminuir"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[2ch] text-center font-mono text-xs tabular-nums text-muted-foreground">
              {count}
            </span>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => onIncrement(1)}
              aria-label="Aumentar"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {done && !quantitative && count > 1 && (
          <span className="text-xs text-muted-foreground">{count}×</span>
        )}
        <Button
          variant="ghost"
          size="iconSm"
          onClick={onEdit}
          aria-label="Editar"
          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EmptyIllustration({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/30 p-12 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-8 w-8 text-primary"
        >
          <path
            d="M4 12.5L9.5 18L20 7"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="font-display text-lg font-semibold">Comece com um hábito</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Pequenas consistências compõem grandes mudanças. Crie seu primeiro
        hábito e marque hoje.
      </p>
      <Button onClick={onCreate} className="mt-4">
        <Plus className="h-4 w-4" />
        Novo hábito
      </Button>
    </div>
  );
}

// ------- helpers -------

function addDaysISO(dateKey: string, delta: number): string {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function computeStreakFromDates(dates: string[], today: string): number {
  const set = new Set(dates);
  if (set.size === 0) return 0;
  // walk back starting from today; if today missing but yesterday present, start from yesterday
  let cursor = new Date(today + "T00:00:00");
  if (!set.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
