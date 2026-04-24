import { useCallback, useEffect, useMemo, useState } from "react";
import type { DbBundle } from "@/db/client";
import type { Habit } from "@/db/schema";
import type { CompletionRecord, WeeklyCount } from "@/db/queries";
import { Hero } from "./Hero";
import { HabitGridCard } from "./HabitGridCard";
import { HabitDetail } from "./HabitDetail";
import { Button } from "@/components/ui/button";
import { HIcon } from "./icons/HIcon";
import { toDateKey, todayKey, type DateKey } from "@/lib/date";
import { addDays, startOfWeek } from "date-fns";
import {
  ALL_DAYS_SCHEDULE,
  isScheduledOn,
} from "@/lib/schedule";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
} from "@/lib/streak";
import { cn } from "@/lib/utils";

interface Props {
  bundle: DbBundle | null;
  habits: Habit[];
  selected: Habit | null;
  detailCompletions: CompletionRecord[];
  detailWeekly: WeeklyCount[];
  retroactiveLimitDays: number;
  onSelectHabit: (id: string) => void;
  onToggleAny: (habitId: string, date: Date) => Promise<void>;
  onToggleDetailToday: () => void;
  onIncrementDetailToday: (delta: number) => void;
  onEditDetail: () => void;
  onArchiveDetail: () => void;
  onUnarchiveDetail: () => void;
  onPauseDetail: () => void;
  onResumeDetail: () => void;
  onDeleteDetail: () => void;
  onCellClickDetail: (date: Date) => void;
  onOpenCreate: () => void;
}

interface AllDatesMap {
  [habitId: string]: DateKey[];
}

/**
 * Dashboard view — hero + habits grid + detail panel.
 * Handles both "today" and "archived" (via the Sidebar's toggle; we check
 * the habit list passed in).
 */
export function TodayView({
  bundle,
  habits,
  selected,
  detailCompletions,
  detailWeekly,
  retroactiveLimitDays,
  onSelectHabit,
  onToggleAny,
  onToggleDetailToday,
  onIncrementDetailToday,
  onEditDetail,
  onArchiveDetail,
  onUnarchiveDetail,
  onPauseDetail,
  onResumeDetail,
  onDeleteDetail,
  onCellClickDetail,
  onOpenCreate,
}: Props) {
  const today = todayKey();
  const [todayMap, setTodayMap] = useState<Map<string, { count: number }>>(
    new Map(),
  );
  const [allDates, setAllDates] = useState<AllDatesMap>({});
  const [filter, setFilter] = useState<string>("Todos");

  // Today-completions live query
  const refreshTodayMap = useCallback(async () => {
    if (!bundle) return;
    const { rows } = await bundle.pg.query<{
      habit_id: string;
      count: number;
    }>(`SELECT habit_id, count FROM completions WHERE date = $1`, [today]);
    const map = new Map<string, { count: number }>();
    for (const r of rows) map.set(r.habit_id, { count: r.count });
    setTodayMap(map);
  }, [bundle, today]);

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    let unsub: (() => void) | null = null;
    bundle.pg.live
      .query<{ habit_id: string; count: number }>(
        `SELECT habit_id, count FROM completions WHERE date = $1`,
        [today],
        (res) => {
          if (cancelled) return;
          const map = new Map<string, { count: number }>();
          for (const r of res.rows)
            map.set(r.habit_id, { count: r.count });
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

  // Fetch completion dates for each habit for streak/grid pct
  useEffect(() => {
    if (!bundle || habits.length === 0) return;
    let cancelled = false;
    (async () => {
      const map: AllDatesMap = {};
      const since = toDateKey(addDays(new Date(), -400));
      for (const h of habits) {
        const { rows } = await bundle.pg.query<{ date: string }>(
          `SELECT date::text AS date FROM completions
             WHERE habit_id = $1 AND date >= $2
             ORDER BY date ASC LIMIT 500`,
          [h.id, since],
        );
        map[h.id] = rows.map((r) => r.date);
      }
      if (!cancelled) setAllDates(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [bundle, habits, todayMap]);

  // Computed metrics
  const todaysHabits = useMemo(
    () =>
      habits.filter(
        (h) =>
          !h.archivedAt &&
          !h.pausedAt &&
          isScheduledOn(h.schedule ?? ALL_DAYS_SCHEDULE, new Date()),
      ),
    [habits],
  );
  const offDayHabits = useMemo(
    () =>
      habits.filter(
        (h) =>
          !h.archivedAt &&
          !h.pausedAt &&
          !isScheduledOn(h.schedule ?? ALL_DAYS_SCHEDULE, new Date()) &&
          (h.schedule ?? ALL_DAYS_SCHEDULE) !== ALL_DAYS_SCHEDULE,
      ),
    [habits],
  );
  const done = todaysHabits.filter((h) => todayMap.has(h.id)).length;
  const total = todaysHabits.length;

  const streakByHabit = useMemo(() => {
    const out: { [id: string]: { current: number; longest: number } } = {};
    for (const h of habits) {
      const dates = allDates[h.id] ?? [];
      out[h.id] = {
        current: calculateCurrentStreak(
          dates,
          today,
          h.schedule ?? ALL_DAYS_SCHEDULE,
        ),
        longest: calculateLongestStreak(
          dates,
          h.schedule ?? ALL_DAYS_SCHEDULE,
        ),
      };
    }
    return out;
  }, [habits, allDates, today]);

  const maxCurrent = useMemo(() => {
    let best: { id: string; streak: number; name: string } | null = null;
    for (const h of habits) {
      const s = streakByHabit[h.id]?.current ?? 0;
      if (!best || s > best.streak) best = { id: h.id, streak: s, name: h.name };
    }
    return best ?? { id: "", streak: 0, name: "" };
  }, [habits, streakByHabit]);

  // (recordStreak is computed in App.tsx/Sidebar via its own query; leaving
  // this block out avoids a duplicate pass here.)

  // Week summary: done/goal + dots
  const weekInfo = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const todayDate = new Date();
    let weekDone = 0;
    let weekGoal = 0;
    const dots: boolean[] = Array.from({ length: 7 }, () => false);
    for (const h of habits) {
      if (h.archivedAt || h.pausedAt) continue;
      const sch = h.schedule ?? ALL_DAYS_SCHEDULE;
      const dates = allDates[h.id] ?? [];
      const set = new Set(dates);
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        if (d > todayDate) continue;
        const key = toDateKey(d);
        if (isScheduledOn(sch, d)) {
          weekGoal += 1;
          if (set.has(key)) {
            weekDone += 1;
            dots[i] = true;
          }
        } else if (set.has(key)) {
          dots[i] = true;
        }
      }
    }
    return { weekDone, weekGoal, dots };
  }, [habits, allDates]);

  const percentsByHabit = useMemo(() => {
    const out: { [id: string]: number } = {};
    for (const h of habits) {
      const dates = allDates[h.id] ?? [];
      const sch = h.schedule ?? ALL_DAYS_SCHEDULE;
      // Completion rate on the last 30 scheduled days
      let marked = 0;
      let scheduled = 0;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const d = addDays(today, -i);
        if (isScheduledOn(sch, d)) {
          scheduled += 1;
          if (dates.includes(toDateKey(d))) marked += 1;
        }
      }
      out[h.id] = scheduled === 0 ? 0 : Math.round((marked / scheduled) * 100);
    }
    return out;
  }, [habits, allDates]);

  // Tags for filters
  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const h of habits) if (h.tag) set.add(h.tag);
    return ["Todos", ...Array.from(set).sort()];
  }, [habits]);

  const filteredHabits = useMemo(() => {
    if (filter === "Todos") return habits;
    return habits.filter((h) => h.tag === filter);
  }, [habits, filter]);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <Hero
        total={total}
        done={done}
        maxStreak={maxCurrent.streak}
        maxStreakHabit={maxCurrent.name}
        weekDone={weekInfo.weekDone}
        weekGoal={weekInfo.weekGoal}
        weekCompleted={weekInfo.dots}
      />

      {habits.length === 0 ? (
        <EmptyState onCreate={onOpenCreate} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1.4fr] lg:gap-6">
          {/* Left: habit grid */}
          <div>
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-[17px] font-semibold text-ink tracking-tighter">
                  Hábitos de hoje{" "}
                  <span className="font-medium text-ink-mute">
                    ({todaysHabits.length})
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[10.5px] text-ink-dim">
                  Clique em um card para ver detalhes
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.slice(0, 4).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "h-7 rounded-pill border px-3 text-[12px] font-medium transition-colors",
                      filter === f
                        ? "border-border-strong bg-surface-3 text-ink"
                        : "border-border bg-transparent text-ink-dim hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredHabits.map((h) => (
                <HabitGridCard
                  key={h.id}
                  habit={h}
                  done={todayMap.has(h.id)}
                  streakDays={streakByHabit[h.id]?.current ?? 0}
                  completionPct={percentsByHabit[h.id] ?? 0}
                  entries={(allDates[h.id] ?? []).map((d) => ({
                    date: d,
                    count: 1,
                  }))}
                  selected={selected?.id === h.id}
                  onSelect={() => onSelectHabit(h.id)}
                  onToggle={async () => {
                    await onToggleAny(h.id, new Date());
                    await refreshTodayMap();
                  }}
                />
              ))}
            </div>

            {offDayHabits.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                  Outros dias da semana
                </div>
                <ul className="flex flex-col gap-2">
                  {offDayHabits.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => onSelectHabit(h.id)}
                        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border bg-surface-2/50 px-4 py-3 text-left text-[13px] opacity-80 transition-colors hover:opacity-100"
                      >
                        <span className="text-base leading-none">
                          {h.emoji ?? "•"}
                        </span>
                        <span className="flex-1 text-ink-dim">{h.name}</span>
                        <HIcon
                          name="chevron-right"
                          size={14}
                          color="rgb(var(--text-mute))"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: detail panel */}
          <div>
            {selected ? (
              <HabitDetail
                bundle={bundle}
                habit={selected}
                completions={detailCompletions}
                weekly={detailWeekly}
                retroactiveLimitDays={retroactiveLimitDays}
                onToggleToday={onToggleDetailToday}
                onIncrementToday={onIncrementDetailToday}
                onCellClick={onCellClickDetail}
                onArchive={onArchiveDetail}
                onUnarchive={onUnarchiveDetail}
                onPause={onPauseDetail}
                onResume={onResumeDetail}
                onDelete={onDeleteDetail}
                onEdit={onEditDetail}
              />
            ) : (
              <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 font-mono text-[11px] text-ink-mute">
                Selecione um hábito para ver detalhes
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 p-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-lg bg-accent-soft ring-1 ring-accent-ring">
        <HIcon name="check" size={24} color="rgb(var(--accent))" strokeWidth={2} />
      </div>
      <h3 className="mt-4 font-display text-[17px] font-semibold tracking-tighter text-ink">
        Comece com um hábito
      </h3>
      <p className="mt-1 max-w-xs text-[13px] leading-[1.5] text-ink-dim">
        Pequenas consistências compõem grandes mudanças. Crie seu primeiro
        hábito e marque hoje.
      </p>
      <Button variant="primary" size="md" className="mt-4" onClick={onCreate}>
        <HIcon name="plus" size={14} strokeWidth={2} />
        Novo hábito
      </Button>
    </div>
  );
}
