import { useMemo } from "react";
import { Check, Trash2 } from "lucide-react";
import type { Habit } from "@/db/schema";
import type { WeeklyCount } from "@/db/queries";
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
import { todayKey, type DateKey } from "@/lib/date";

interface Props {
  habit: Habit;
  completions: DateKey[];
  weekly: WeeklyCount[];
  onToggleToday: () => void;
  onToggleDate: (date: Date) => void;
  onDelete: () => void;
}

export function HabitCard({
  habit,
  completions,
  weekly,
  onToggleToday,
  onToggleDate,
  onDelete,
}: Props) {
  const today = todayKey();
  const doneToday = completions.includes(today);

  const { current, longest } = useMemo(
    () => ({
      current: calculateCurrentStreak(completions, today),
      longest: calculateLongestStreak(completions),
    }),
    [completions, today],
  );

  return (
    <div className="space-y-6">
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
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={doneToday ? "secondary" : "default"}
              onClick={onToggleToday}
            >
              <Check className="h-4 w-4" />
              {doneToday ? "Desmarcar hoje" : "Marcar hoje"}
            </Button>
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
        <CardContent>
          <StreakBadge current={current} longest={longest} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos 12 meses</CardTitle>
          <CardDescription>Clique em um dia para alternar</CardDescription>
        </CardHeader>
        <CardContent>
          <Heatmap
            completions={completions}
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
