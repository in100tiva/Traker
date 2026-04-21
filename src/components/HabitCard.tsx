import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
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
import { MilestoneChips } from "./MilestoneChips";
import { WeeklyProgressDots } from "./WeeklyProgressDots";
import { Heatmap } from "./Heatmap";
import { MonthlyHeatmap } from "./MonthlyHeatmap";
import { HabitInsights } from "./HabitInsights";
import { WeeklyChart } from "./WeeklyChart";
import { WeekdayHistogram } from "./WeekdayHistogram";
import { StreakTrendChart } from "./StreakTrendChart";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateWeeklyGoalStreak,
} from "@/lib/streak";
import { checkAndCelebrateMilestone } from "@/lib/milestones";
import { haptics } from "@/lib/haptics";
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
  const weeklyRemaining = Math.max(0, habit.targetPerWeek - thisWeekCount);

  const dailyProgress =
    habit.targetPerDay && habit.targetPerDay > 0
      ? Math.min(1, todayCount / habit.targetPerDay)
      : null;

  const isArchived = Boolean(habit.archivedAt);
  const isPaused = Boolean(habit.pausedAt);
  const isMobile = useMediaQuery("(max-width: 767px)");

  return (
    <div className="space-y-6">
      {isArchived && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Archive className="h-4 w-4" />
          Arquivado em{" "}
          {format(habit.archivedAt!, "dd/MM/yyyy", { locale: ptBR })} · dados
          preservados.
        </div>
      )}
      {isPaused && !isArchived && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          <Pause className="h-4 w-4" />
          Pausado em {format(habit.pausedAt!, "dd/MM/yyyy", { locale: ptBR })} ·
          streak não é quebrada.
        </div>
      )}

      {/* HERO */}
      <Card
        elevated
        className="relative overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(circle at top right, ${habit.color}18, transparent 55%)`,
        }}
      >
        <CardHeader className="gap-4 pb-4 md:flex-row md:items-start md:justify-between md:space-y-0">
          <div className="flex items-start gap-3">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
              style={{
                backgroundColor: `${habit.color}22`,
                border: `1.5px solid ${habit.color}`,
              }}
            >
              {habit.emoji ?? (
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: habit.color }}
                />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl">{habit.name}</CardTitle>
                {habit.isNegative && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Abstinência
                  </span>
                )}
                {habit.tag && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    #{habit.tag}
                  </span>
                )}
              </div>
              {habit.description && (
                <CardDescription className="mt-0.5">
                  {habit.description}
                </CardDescription>
              )}
              <CardDescription className="mt-1 text-xs">
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
                  onClick={() => {
                    haptics.tap();
                    onToggleToday();
                  }}
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

        <CardContent className="space-y-6">
          <StreakBadge
            current={current}
            longest={longest}
            weeklyGoalStreak={weeklyGoalStreak}
            color={habit.color}
          />

          {dailyProgress !== null && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">
                  Hoje
                </span>
                <span className="tabular-nums">
                  <span className="font-semibold">{todayCount}</span>
                  <span className="text-muted-foreground">
                    /{habit.targetPerDay} {habit.unit ?? ""}
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: habit.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyProgress * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          <WeeklyProgressDots
            completedDates={completedDates}
            color={habit.color}
            target={habit.targetPerWeek}
          />

          {weeklyRemaining === 0 && habit.targetPerWeek < 7 && (
            <div className="text-center text-sm text-primary">
              Meta semanal atingida 🎯
            </div>
          )}

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Marcos
            </div>
            <MilestoneChips
              currentStreak={longest > current ? longest : current}
              color={habit.color}
            />
          </div>
        </CardContent>
      </Card>

      <HabitInsights
        completions={completions}
        weekly={weekly}
        targetPerWeek={habit.targetPerWeek}
        color={habit.color}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividade</CardTitle>
          <CardDescription>
            {isMobile
              ? "Toque em um dia para marcar ou adicionar nota."
              : "Clique em um dia para marcar ou adicionar uma nota. O ponto branco indica dias com nota."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <MonthlyHeatmap
              entries={completions}
              color={habit.color}
              onCellClick={onCellClick}
              retroactiveLimitDays={retroactiveLimitDays}
            />
          ) : (
            <Heatmap
              entries={completions}
              color={habit.color}
              onCellClick={onCellClick}
              retroactiveLimitDays={retroactiveLimitDays}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Semanas recentes</CardTitle>
            <CardDescription>Últimas 12 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyChart
              data={weekly}
              color={habit.color}
              target={habit.targetPerWeek}
            />
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
          <CardDescription>
            Percentual de dias da semana com marcação, desde a primeira
            completada
          </CardDescription>
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
