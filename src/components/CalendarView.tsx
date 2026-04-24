import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Habit } from "@/db/schema";
import type { DbBundle } from "@/db/client";
import { Button } from "@/components/ui/button";
import { HIcon } from "./icons/HIcon";
import { IconTile } from "./IconTile";
import { toDateKey } from "@/lib/date";
import { ALL_DAYS_SCHEDULE, isScheduledOn } from "@/lib/schedule";
import { cn } from "@/lib/utils";

interface Props {
  bundle: DbBundle | null;
  habits: Habit[];
}

type DayCompletions = Map<string, Set<string>>; // date → set of habitIds

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarView({ bundle, habits }: Props) {
  const todayDate = new Date();
  const [cursor, setCursor] = useState<Date>(() => todayDate);
  const [selectedDay, setSelectedDay] = useState<Date>(() => todayDate);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  const [completions, setCompletions] = useState<DayCompletions>(new Map());

  useEffect(() => {
    if (!bundle || habits.length === 0) {
      setCompletions(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const from = toDateKey(gridStart);
      const to = toDateKey(gridEnd);
      const activeHabits = habits.filter((h) => !h.archivedAt);
      const ids = activeHabits.map((h) => h.id);
      if (ids.length === 0) {
        setCompletions(new Map());
        return;
      }
      // Build placeholders $1, $2, ... for the id list
      const placeholders = ids.map((_, i) => `$${i + 3}`).join(",");
      const { rows } = await bundle.pg.query<{
        date: string;
        habit_id: string;
      }>(
        `SELECT date::text AS date, habit_id FROM completions
           WHERE date BETWEEN $1 AND $2
             AND habit_id IN (${placeholders})`,
        [from, to, ...ids],
      );
      if (cancelled) return;
      const map: DayCompletions = new Map();
      for (const r of rows) {
        if (!map.has(r.date)) map.set(r.date, new Set());
        map.get(r.date)!.add(r.habit_id);
      }
      setCompletions(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [bundle, habits, gridStart, gridEnd]);

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archivedAt && !h.pausedAt),
    [habits],
  );

  // Compute stats for the viewed month
  const monthStats = useMemo(() => {
    let totalCompletions = 0;
    let daysWithAny = 0;
    let perfectDays = 0;
    let totalDays = 0;
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    for (const d of monthDays) {
      if (d > todayDate) continue;
      totalDays += 1;
      const key = toDateKey(d);
      const done = completions.get(key)?.size ?? 0;
      if (done > 0) daysWithAny += 1;
      totalCompletions += done;
      const scheduledCount = activeHabits.filter((h) =>
        isScheduledOn(h.schedule ?? ALL_DAYS_SCHEDULE, d),
      ).length;
      if (scheduledCount > 0 && done >= scheduledCount) perfectDays += 1;
    }
    const rate =
      totalDays === 0 || activeHabits.length === 0
        ? 0
        : Math.round(
            (totalCompletions / (totalDays * activeHabits.length)) * 100,
          );
    return { totalCompletions, daysWithAny, perfectDays, totalDays, rate };
  }, [completions, monthStart, monthEnd, todayDate, activeHabits]);

  const selectedKey = toDateKey(selectedDay);
  const selectedDone = completions.get(selectedKey) ?? new Set();
  const selectedScheduled = activeHabits.filter((h) =>
    isScheduledOn(h.schedule ?? ALL_DAYS_SCHEDULE, selectedDay),
  );
  const selectedDoneList = activeHabits.filter((h) =>
    selectedDone.has(h.id),
  );
  const selectedMissedList = selectedScheduled.filter(
    (h) => !selectedDone.has(h.id),
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
            Visão mensal
          </div>
          <div className="mt-1 font-display text-[26px] font-bold leading-none tracking-tightest text-ink capitalize md:text-[32px]">
            {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            aria-label="Mês anterior"
          >
            <HIcon name="chevron-left" size={15} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setCursor(todayDate);
              setSelectedDay(todayDate);
            }}
          >
            Hoje
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Próximo mês"
          >
            <HIcon name="chevron-right" size={15} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MiniStat
          label="Dias ativos"
          value={String(monthStats.daysWithAny)}
          sub={`de ${monthStats.totalDays} dias`}
        />
        <MiniStat
          label="Dias perfeitos"
          value={String(monthStats.perfectDays)}
          sub="todos os hábitos"
          accent
        />
        <MiniStat
          label="Conclusões"
          value={String(monthStats.totalCompletions)}
          sub="no mês"
        />
        <MiniStat
          label="Taxa"
          value={`${monthStats.rate}%`}
          sub="média mensal"
        />
      </div>

      {/* Grid + side panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-border bg-surface p-3 md:p-4">
          {/* Weekday labels */}
          <div className="mb-2 grid grid-cols-7 gap-1.5 md:gap-2">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-mute"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {days.map((d) => {
              const key = toDateKey(d);
              const inMonth = isSameMonth(d, monthStart);
              const done = completions.get(key)?.size ?? 0;
              const scheduledCount = activeHabits.filter((h) =>
                isScheduledOn(h.schedule ?? ALL_DAYS_SCHEDULE, d),
              ).length;
              const ratio =
                scheduledCount === 0
                  ? done > 0
                    ? 1
                    : 0
                  : Math.min(1, done / scheduledCount);
              const level =
                ratio === 0
                  ? 0
                  : ratio < 0.35
                    ? 1
                    : ratio < 0.6
                      ? 2
                      : ratio < 0.85
                        ? 3
                        : 4;
              const bg = [
                "rgb(var(--hm-0))",
                "rgb(var(--hm-1))",
                "rgb(var(--hm-2))",
                "rgb(var(--hm-3))",
                "rgb(var(--hm-4))",
              ][level];
              const isSelected = toDateKey(d) === selectedKey;
              const isToday = toDateKey(d) === toDateKey(todayDate);
              const isFuture = d > todayDate;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  disabled={isFuture}
                  className={cn(
                    "relative flex aspect-square flex-col items-start justify-between rounded-md border p-2 text-left transition-all",
                    inMonth ? "opacity-100" : "opacity-40",
                    isFuture && "cursor-not-allowed opacity-30",
                    isSelected
                      ? "border-accent ring-2 ring-accent/30"
                      : isToday
                        ? "border-border-strong"
                        : "border-border",
                  )}
                  style={{
                    backgroundColor: bg,
                    color:
                      level >= 4
                        ? "rgb(10,10,10)"
                        : level > 0
                          ? "rgb(var(--text))"
                          : "rgb(var(--text-dim))",
                  }}
                >
                  <span
                    className={cn(
                      "font-display text-[12px] tracking-tighter md:text-[13px]",
                      isToday ? "font-bold" : "font-medium",
                    )}
                  >
                    {getDate(d)}
                  </span>
                  {done > 0 && (
                    <span className="font-mono text-[9px] font-semibold">
                      {done}/{scheduledCount || done}
                    </span>
                  )}
                  {isToday && (
                    <span
                      className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full bg-accent"
                      style={{
                        boxShadow: "0 0 0 1px rgb(var(--bg))",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-2 border-t border-border pt-3 font-mono text-[10px] uppercase tracking-wide text-ink-mute">
            Menos
            {[0, 1, 2, 3, 4].map((l) => (
              <div
                key={l}
                className="h-3 w-3 rounded-sm border border-border"
                style={{ background: `rgb(var(--hm-${l}))` }}
              />
            ))}
            Mais
          </div>
        </div>

        {/* Side panel */}
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
            {format(selectedDay, "d 'de' MMMM", { locale: ptBR })}
          </div>
          <div className="mt-1 font-display text-[18px] font-bold text-ink tracking-tighter">
            {selectedDoneList.length} de{" "}
            {selectedScheduled.length > 0
              ? selectedScheduled.length
              : activeHabits.length}{" "}
            hábitos
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-surface-3">
            <div
              className="h-full bg-accent"
              style={{
                width: `${
                  selectedScheduled.length > 0
                    ? (selectedDoneList.length / selectedScheduled.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>

          {selectedDoneList.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-wider text-ink-mute">
                Concluídos
              </div>
              <ul className="flex flex-col gap-1.5">
                {selectedDoneList.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-2 rounded-sm border border-border bg-bg p-2"
                  >
                    <IconTile
                      emoji={h.emoji}
                      iconName={h.emoji ? undefined : "check"}
                      size={26}
                    />
                    <span className="flex-1 truncate text-[13px] font-medium text-ink">
                      {h.name}
                    </span>
                    <div className="grid h-4.5 w-4.5 place-items-center rounded-full bg-accent text-[rgb(10,10,10)]">
                      <HIcon name="check" size={10} strokeWidth={2.5} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedMissedList.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 font-mono text-[9px] uppercase tracking-wider text-ink-mute">
                Perdidos
              </div>
              <ul className="flex flex-col gap-1.5 opacity-65">
                {selectedMissedList.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-2 rounded-sm border border-border bg-bg p-2"
                  >
                    <IconTile
                      emoji={h.emoji}
                      iconName={h.emoji ? undefined : "check"}
                      size={26}
                    />
                    <span className="flex-1 truncate text-[13px] text-ink-dim">
                      {h.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3.5",
        accent
          ? "border-transparent bg-accent text-[rgb(10,10,10)]"
          : "border-border bg-surface text-ink",
      )}
    >
      <div
        className={cn(
          "font-mono text-[9px] font-semibold uppercase tracking-wide",
          accent ? "opacity-70" : "text-ink-mute",
        )}
      >
        {label}
      </div>
      <div className="mt-1.5 font-display text-[24px] font-bold leading-none tracking-tighter">
        {value}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-[10px]",
          accent ? "opacity-70" : "text-ink-dim",
        )}
      >
        {sub}
      </div>
    </div>
  );
}
