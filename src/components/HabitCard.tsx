import { useEffect, useMemo } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { startOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Habit } from "@/db/schema";
import type { DbBundle } from "@/db/client";
import type { CompletionRecord, WeeklyCount } from "@/db/queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StreakBadge } from "./StreakBadge";
import { Heatmap } from "./Heatmap";
import { WeeklyChart } from "./WeeklyChart";
import { WeekdayHistogram } from "./WeekdayHistogram";
import { StreakTrendChart } from "./StreakTrendChart";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateWeeklyGoalStreak,
} from "@/lib/streak";
import { checkAndCelebrateMilestone } from "@/lib/milestones";
import { todayKey, toDateKey, type DateKey } from "@/lib/date";

interface Props {
  bundle: DbBundle | null;
  habit: Habit;
  completions: CompletionRecord[];
  weekly: WeeklyCount[];
  retroactiveLimitDays: number;
  onToggleToday: () => void;
  onIncrementToday: (delta: number) => void;
  onCellClick: (date: Date) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

export function HabitCard({
  bundle,
  habit,
  completions,
  weekly,
  retroactiveLimitDays,
  onToggleToday,
  onIncrementToday,
  onCellClick,
  onArchive,
  onUnarchive,
  onPause,
  onResume,
  onDelete,
  onEdit,
}: Props) {
  const today = todayKey();
  const completedDates = useMemo(
    () => completions.map((c) => c.date as DateKey),
    [completions],
  );
  const todayEntry = completions.find((c) => c.date === today);
  const doneToday = Boolean(todayEntry);
  const todayCount = todayEntry?.count ?? 0;

  const { current, longest, weeklyGoalStreak } = useMemo(
    () => ({
      current: calculateCurrentStreak(completedDates, today),
      longest: calculateLongestStreak(completedDates),
      weeklyGoalStreak: calculateWeeklyGoalStreak(
        completedDates,
        habit.targetPerWeek,
        today,
      ),
    }),
    [completedDates, today, habit.targetPerWeek],
  );

  useEffect(() => {
    checkAndCelebrateMilestone(habit.id, habit.name, current);
  }, [habit.id, habit.name, current]);

  const thisWeekKey = toDateKey(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const thisWeekCount =
    weekly.find((w) => w.weekStart === thisWeekKey)?.count ?? 0;
  const weeklyProgress = Math.min(1, thisWeekCount / habit.targetPerWeek);
  const weeklyRemaining = Math.max(0, habit.targetPerWeek - thisWeekCount);

  const dailyProgress =
    habit.targetPerDay && habit.targetPerDay > 0
      ? Math.min(1, todayCount / habit.targetPerDay)
      : null;

  const isArchived = Boolean(habit.archivedAt);
  const isPaused = Boolean(habit.pausedAt);

  return (
    <div className="space-y-6">
      {isArchived && (
        <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
          Arquivado em{" "}
          {format(habit.archivedAt!, "dd/MM/yyyy", { locale: ptBR })}. Dados
          históricos preservados.
        </div>
      )}
      {isPaused && !isArchived && (
        <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
          Pausado em{" "}
          {format(habit.pausedAt!, "dd/MM/yyyy", { locale: ptBR })}. Não aparece
          em "Hoje"; streak não é quebrada pela pausa.
        </div>
      )}
      <Card>
        <CardHeader className="flex-col gap-3 space-y-0 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <span
              className="mt-1 h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: habit.color }}
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{habit.name}</CardTitle>
                {habit.isNegative && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Abstinência
                  </span>
                )}
                {habit.tag && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    #{habit.tag}
                  </span>
                )}
              </div>
              {habit.description && (
                <CardDescription>{habit.description}</CardDescription>
              )}
              <CardDescription className="mt-1">
                Meta: {habit.targetPerWeek}×/semana
                {habit.targetPerDay ? (
                  <>
                    {" · "}
                    {habit.targetPerDay} {habit.unit ?? ""}/dia
                  </>
                ) : null}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isArchived && !isPaused && (
              <>
                <Button
                  variant={doneToday ? "secondary" : "default"}
                  onClick={onToggleToday}
                >
                  <Check className="h-4 w-4" />
                  {doneToday
                    ? `Feito hoje${todayCount > 1 ? ` (${todayCount})` : ""}`
                    : habit.isNegative
                      ? "Dia sem"
                      : "Marcar hoje"}
                </Button>
                {doneToday && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onIncrementToday(-1)}
                      aria-label="Diminuir"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onIncrementToday(1)}
                      aria-label="Aumentar"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
            )}
            {!isArchived && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                aria-label="Editar hábito"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {!isArchived &&
              (isPaused ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onResume}
                  aria-label="Retomar"
                >
                  <Play className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPause}
                  aria-label="Pausar"
                >
                  <Pause className="h-4 w-4" />
                </Button>
              ))}
            {isArchived ? (
              <Button
                variant="outline"
                onClick={onUnarchive}
                aria-label="Restaurar hábito"
              >
                <ArchiveRestore className="h-4 w-4" />
                Restaurar
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={onArchive}
                aria-label="Arquivar hábito"
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label="Excluir hábito"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StreakBadge
            current={current}
            longest={longest}
            weeklyGoalStreak={weeklyGoalStreak}
          />
          {dailyProgress !== null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Hoje: {todayCount}/{habit.targetPerDay} {habit.unit ?? ""}
                </span>
                <span>{Math.round(dailyProgress * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${dailyProgress * 100}%`,
                    backgroundColor: habit.color,
                  }}
                />
              </div>
            </div>
          )}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Esta semana: {thisWeekCount}/{habit.targetPerWeek}
              </span>
              <span>
                {weeklyRemaining === 0
                  ? "Meta atingida 🎯"
                  : `Faltam ${weeklyRemaining}`}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full transition-all"
                style={{
                  width: `${weeklyProgress * 100}%`,
                  backgroundColor: habit.color,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos 12 meses</CardTitle>
          <CardDescription>
            Clique em um dia para marcar/nota — ponto branco = dia com nota
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap
            entries={completions}
            color={habit.color}
            onCellClick={onCellClick}
            retroactiveLimitDays={retroactiveLimitDays}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completude semanal</CardTitle>
            <CardDescription>Últimas 12 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyChart data={weekly} color={habit.color} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendência do streak</CardTitle>
            <CardDescription>Últimos 90 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <StreakTrendChart
              bundle={bundle}
              habitId={habit.id}
              color={habit.color}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por dia da semana</CardTitle>
          <CardDescription>Taxa de completude por weekday</CardDescription>
        </CardHeader>
        <CardContent>
          <WeekdayHistogram
            bundle={bundle}
            habitId={habit.id}
            color={habit.color}
          />
        </CardContent>
      </Card>
    </div>
  );
}
