import { useMemo } from "react";
import { Archive, ArchiveRestore, Check, Minus, Plus, Trash2 } from "lucide-react";
import { startOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Habit } from "@/db/schema";
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
import {
  calculateCurrentStreak,
  calculateLongestStreak,
} from "@/lib/streak";
import { todayKey, toDateKey, type DateKey } from "@/lib/date";

interface Props {
  habit: Habit;
  completions: CompletionRecord[];
  weekly: WeeklyCount[];
  onToggleToday: () => void;
  onIncrementToday: (delta: number) => void;
  onToggleDate: (date: Date) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

export function HabitCard({
  habit,
  completions,
  weekly,
  onToggleToday,
  onIncrementToday,
  onToggleDate,
  onArchive,
  onUnarchive,
  onDelete,
}: Props) {
  const today = todayKey();
  const completedDates = useMemo(
    () => completions.map((c) => c.date as DateKey),
    [completions],
  );
  const todayEntry = completions.find((c) => c.date === today);
  const doneToday = Boolean(todayEntry);
  const todayCount = todayEntry?.count ?? 0;

  const { current, longest } = useMemo(
    () => ({
      current: calculateCurrentStreak(completedDates, today),
      longest: calculateLongestStreak(completedDates),
    }),
    [completedDates, today],
  );

  const thisWeekKey = toDateKey(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const thisWeekCount =
    weekly.find((w) => w.weekStart === thisWeekKey)?.count ?? 0;
  const weeklyProgress = Math.min(1, thisWeekCount / habit.targetPerWeek);
  const weeklyRemaining = Math.max(0, habit.targetPerWeek - thisWeekCount);
  const isArchived = Boolean(habit.archivedAt);

  return (
    <div className="space-y-6">
      {isArchived && (
        <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
          Arquivado em{" "}
          {format(habit.archivedAt!, "dd/MM/yyyy", { locale: ptBR })}. Dados
          históricos preservados.
        </div>
      )}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div className="flex items-start gap-3">
            <span
              className="mt-1 h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: habit.color }}
            />
            <div>
              <CardTitle>{habit.name}</CardTitle>
              {habit.description && (
                <CardDescription>{habit.description}</CardDescription>
              )}
              <CardDescription className="mt-1">
                Meta: {habit.targetPerWeek}×/semana
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {!isArchived && (
              <>
                <Button
                  variant={doneToday ? "secondary" : "default"}
                  onClick={onToggleToday}
                >
                  <Check className="h-4 w-4" />
                  {doneToday ? `Feito hoje (${todayCount})` : "Marcar hoje"}
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
          <StreakBadge current={current} longest={longest} />
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Esta semana: {thisWeekCount}/{habit.targetPerWeek}
              </span>
              <span>
                {weeklyRemaining === 0 ? "Meta atingida 🎯" : `Faltam ${weeklyRemaining}`}
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
          <CardDescription>Clique em um dia para alternar</CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap
            entries={completions}
            color={habit.color}
            onToggle={onToggleDate}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completude semanal</CardTitle>
          <CardDescription>Últimas 12 semanas</CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyChart data={weekly} color={habit.color} />
        </CardContent>
      </Card>
    </div>
  );
}
