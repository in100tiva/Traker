import { Flame, Target, Trophy } from "lucide-react";

interface Props {
  current: number;
  longest: number;
  weeklyGoalStreak?: number;
}

export function StreakBadge({ current, longest, weeklyGoalStreak }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
        <Flame className="h-4 w-4 text-orange-500" />
        <div>
          <div className="text-xs text-muted-foreground">Sequência atual</div>
          <div className="text-xl font-semibold">{current}d</div>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <div>
          <div className="text-xs text-muted-foreground">Maior sequência</div>
          <div className="text-xl font-semibold">{longest}d</div>
        </div>
      </div>
      {weeklyGoalStreak !== undefined && (
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
          <Target className="h-4 w-4 text-primary" />
          <div>
            <div className="text-xs text-muted-foreground">Semanas c/ meta</div>
            <div className="text-xl font-semibold">{weeklyGoalStreak}s</div>
          </div>
        </div>
      )}
    </div>
  );
}
