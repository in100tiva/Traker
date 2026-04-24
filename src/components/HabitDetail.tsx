import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Habit } from "@/db/schema";
import type { DbBundle } from "@/db/client";
import type { CompletionRecord, WeeklyCount } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { StatCard } from "./StatCard";
import { WeekStrip } from "./WeekStrip";
import { Heatmap } from "./Heatmap";
import { IconTile } from "./IconTile";
import { HIcon } from "./icons/HIcon";
import { HabitInsights } from "./HabitInsights";
import { MonthlyHeatmap } from "./MonthlyHeatmap";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateWeeklyGoalStreak,
} from "@/lib/streak";
import { checkAndCelebrateMilestone } from "@/lib/milestones";
import { haptics } from "@/lib/haptics";
import { todayKey, type DateKey } from "@/lib/date";
import {
  ALL_DAYS_SCHEDULE,
  isScheduledOn,
  scheduleLabel,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

interface Props {
  /** Kept for symmetry with caller — unused internally. */
  bundle?: DbBundle | null;
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

export function HabitDetail({
  bundle: _bundle,
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
  const habitSchedule = habit.schedule ?? ALL_DAYS_SCHEDULE;
  const scheduledToday = isScheduledOn(habitSchedule, new Date());

  const { current, longest, weeklyGoalStreak } = useMemo(
    () => ({
      current: calculateCurrentStreak(completedDates, today, habitSchedule),
      longest: calculateLongestStreak(completedDates, habitSchedule),
      weeklyGoalStreak: calculateWeeklyGoalStreak(
        completedDates,
        habit.targetPerWeek,
        today,
      ),
    }),
    [completedDates, today, habit.targetPerWeek, habitSchedule],
  );

  useEffect(() => {
    checkAndCelebrateMilestone(habit.id, habit.name, current);
  }, [habit.id, habit.name, current]);

  const isMobile = useMediaQuery("(max-width: 767px)");
  const isArchived = Boolean(habit.archivedAt);
  const isPaused = Boolean(habit.pausedAt);

  const categoryLabel = habit.tag ?? "Hábito";
  const subLabel =
    habitSchedule === ALL_DAYS_SCHEDULE
      ? habit.targetPerWeek === 7
        ? "Diário"
        : `${habit.targetPerWeek}×/semana`
      : scheduleLabel(habitSchedule);

  const goalText =
    habit.targetPerDay && habit.unit
      ? `${habit.targetPerDay} ${habit.unit} · ${subLabel.toLowerCase()}`
      : habit.targetPerDay
        ? `${habit.targetPerDay} · ${subLabel.toLowerCase()}`
        : subLabel;

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 md:p-6">
      {isArchived && (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-surface-2 px-3 py-2 font-mono text-[11px] text-ink-dim">
          <HIcon name="archive" size={14} />
          Arquivado em{" "}
          {format(habit.archivedAt!, "dd/MM/yyyy", { locale: ptBR })}
        </div>
      )}
      {isPaused && !isArchived && (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-surface-2 px-3 py-2 font-mono text-[11px] text-ink-dim">
          <HIcon name="pause" size={14} />
          Pausado em {format(habit.pausedAt!, "dd/MM/yyyy", { locale: ptBR })}
        </div>
      )}
      {!isArchived && !isPaused && !scheduledToday && (
        <div className="rounded-md border border-dashed border-border bg-surface-2 px-3 py-2 font-mono text-[11px] text-ink-dim">
          Hoje não é um dia programado — marcar conta como bônus.
        </div>
      )}

      {/* Header — ícone + título empilham; ações em linha separada */}
      <div className="flex flex-col gap-4">
        <div className="flex min-w-0 items-start gap-3 md:gap-4">
          <IconTile
            emoji={habit.emoji}
            iconName={habit.emoji ? undefined : "check"}
            size={56}
            accent
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
                {categoryLabel}
              </div>
              <div className="h-[3px] w-[3px] rounded-full bg-ink-mute" />
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                {subLabel}
              </div>
            </div>
            <div className="mt-1 break-words font-display text-[22px] font-bold leading-tight text-ink tracking-tighter sm:text-[24px] lg:text-[28px]">
              {habit.name}
            </div>
            <div className="mt-1 font-mono text-[12px] text-ink-dim">
              {goalText}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isArchived && !isPaused && (
            <Button
              variant={doneToday ? "secondary" : "primary"}
              size="md"
              onClick={() => {
                haptics.tap();
                onToggleToday();
              }}
            >
              <HIcon name="check" size={16} strokeWidth={2.25} />
              {doneToday
                ? `Feito${todayCount > 1 ? ` (${todayCount})` : ""}`
                : habit.isNegative
                  ? "Dia sem"
                  : "Marcar feito"}
            </Button>
          )}
          {doneToday && habit.targetPerDay && !isArchived && !isPaused && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onIncrementToday(-1)}
                aria-label="Diminuir"
              >
                <HIcon name="minus" size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onIncrementToday(1)}
                aria-label="Aumentar"
              >
                <HIcon name="plus" size={14} />
              </Button>
            </>
          )}
          {!isArchived && (
            <Button variant="outline" size="md" onClick={onEdit}>
              <HIcon name="settings" size={15} />
              <span className="hidden sm:inline">Editar</span>
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
                <HIcon name="play" size={14} />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPause}
                aria-label="Pausar"
              >
                <HIcon name="pause" size={14} />
              </Button>
            ))}
          {isArchived ? (
            <Button variant="outline" size="md" onClick={onUnarchive}>
              <HIcon name="archive-restore" size={15} />
              Restaurar
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onArchive}
              aria-label="Arquivar"
            >
              <HIcon name="archive" size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            aria-label="Excluir"
          >
            <HIcon name="trash" size={14} />
          </Button>
        </div>
      </div>

      {/* Stats row — 2 colunas em qualquer container, 4 só em telas bem largas */}
      <div className="grid grid-cols-2 gap-2.5 2xl:grid-cols-4">
        <StatCard value={`${current} dias`} label="Sequência atual" />
        <StatCard value={`${longest} dias`} label="Recorde" accent />
        <StatCard
          value={`${todayCount}${habit.targetPerDay ? `/${habit.targetPerDay}` : ""}`}
          label={`${habit.unit ?? "hoje"}`}
        />
        <StatCard value={`${weeklyGoalStreak}s`} label="Meta semanal" />
      </div>

      {/* Week strip */}
      <div className="rounded-md border border-border bg-bg p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
          Esta semana
        </div>
        <WeekStrip
          completedDates={completedDates}
          schedule={habitSchedule}
          size={34}
        />
      </div>

      {/* Insights */}
      <HabitInsights
        completions={completions}
        weekly={weekly}
        targetPerWeek={habit.targetPerWeek}
        color="rgb(var(--accent))"
      />

      {/* Full heatmap */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-display text-[15px] font-semibold text-ink">
              Consistência
            </div>
            <div className="mt-0.5 font-mono text-[10.5px] text-ink-dim">
              Clique num dia para adicionar nota ou marcar
            </div>
          </div>
        </div>
        <div
          className={cn(
            "rounded-md border border-border bg-bg p-4",
            isMobile && "p-3",
          )}
        >
          {isMobile ? (
            <MonthlyHeatmap
              entries={completions}
              color="rgb(var(--accent))"
              onCellClick={onCellClick}
              retroactiveLimitDays={retroactiveLimitDays}
            />
          ) : (
            <Heatmap
              entries={completions}
              onCellClick={onCellClick}
              retroactiveLimitDays={retroactiveLimitDays}
            />
          )}
        </div>
      </div>
    </div>
  );
}
