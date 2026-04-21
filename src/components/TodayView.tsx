import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Pencil, Pause } from "lucide-react";
import type { DbBundle } from "@/db/client";
import type { Habit } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { todayKey, type DateKey } from "@/lib/date";

interface Row {
  habit: Habit;
  done: boolean;
  count: number;
}

interface Props {
  bundle: DbBundle | null;
  habits: Habit[];
  onToggle: (habitId: string, date: Date) => Promise<void>;
  onSelectHabit: (id: string) => void;
  onEdit: (habit: Habit) => void;
}

export function TodayView({
  bundle,
  habits,
  onToggle,
  onSelectHabit,
  onEdit,
}: Props) {
  const today = todayKey();
  const [completedToday, setCompletedToday] = useState<
    Map<string, { count: number }>
  >(new Map());

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    bundle.pg.live
      .query<{ habit_id: string; count: number }>(
        `SELECT habit_id, count FROM completions WHERE date = $1`,
        [today],
        (res) => {
          if (cancelled) return;
          const map = new Map<string, { count: number }>();
          for (const r of res.rows) map.set(r.habit_id, { count: r.count });
          setCompletedToday(map);
        },
      )
      .then((sub) => {
        if (cancelled) {
          sub.unsubscribe();
          return;
        }
        unsubscribe = sub.unsubscribe;
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [bundle, today]);

  const rows: Row[] = useMemo(() => {
    return habits
      .filter((h) => !h.archivedAt)
      .map((habit) => {
        const entry = completedToday.get(habit.id);
        return {
          habit,
          done: Boolean(entry),
          count: entry?.count ?? 0,
        };
      });
  }, [habits, completedToday]);

  const active = rows.filter((r) => !r.habit.pausedAt);
  const paused = rows.filter((r) => r.habit.pausedAt);
  const doneCount = active.filter((r) => r.done).length;
  const total = active.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Hoje</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {total === 0
                  ? "Nenhum hábito ativo."
                  : `${doneCount} de ${total} hábitos concluídos`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-semibold">{pct}%</div>
              <div className="text-xs text-muted-foreground">do dia</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {active.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Crie um hábito para começar a acompanhar.
        </div>
      ) : (
        <ul className="space-y-2">
          {active.map((row) => (
            <TodayRow
              key={row.habit.id}
              row={row}
              today={today}
              onToggle={onToggle}
              onSelect={() => onSelectHabit(row.habit.id)}
              onEdit={() => onEdit(row.habit)}
            />
          ))}
        </ul>
      )}

      {paused.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Pause className="h-4 w-4" /> Pausados
          </h3>
          <ul className="space-y-2 opacity-60">
            {paused.map((row) => (
              <TodayRow
                key={row.habit.id}
                row={row}
                today={today}
                onToggle={onToggle}
                onSelect={() => onSelectHabit(row.habit.id)}
                onEdit={() => onEdit(row.habit)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  row: Row;
  today: DateKey;
  onToggle: (habitId: string, date: Date) => Promise<void>;
  onSelect: () => void;
  onEdit: () => void;
}

function TodayRow({ row, onToggle, onSelect, onEdit }: RowProps) {
  const { habit, done } = row;
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50",
        done && "border-primary/40",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void onToggle(habit.id, new Date());
        }}
        aria-label={done ? "Desmarcar" : "Marcar feito"}
        className="shrink-0"
      >
        <Icon
          className="h-7 w-7 transition-colors"
          style={{ color: done ? habit.color : "hsl(var(--muted-foreground))" }}
          fill={done ? habit.color : "none"}
        />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="flex flex-1 flex-col items-start text-left"
      >
        <div className="flex items-center gap-2">
          <span className={cn("font-medium", done && "line-through opacity-60")}>
            {habit.name}
          </span>
          {habit.isNegative && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              Abstinência
            </span>
          )}
          {habit.tag && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {habit.tag}
            </span>
          )}
        </div>
        {habit.description && (
          <span className="text-xs text-muted-foreground">
            {habit.description}
          </span>
        )}
      </button>
      <div className="flex items-center gap-1">
        {row.count > 1 && (
          <span className="text-xs text-muted-foreground">{row.count}×</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label="Editar hábito"
          className="opacity-0 group-hover:opacity-100"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

