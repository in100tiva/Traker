import CountUp from "react-countup";
import { HIcon } from "./icons/HIcon";
import { cn } from "@/lib/utils";

interface Props {
  current: number;
  longest: number;
  weeklyGoalStreak?: number;
  color?: string;
}

function flameColor(streak: number): string {
  if (streak >= 100) return "text-fuchsia-500";
  if (streak >= 30) return "text-red-500";
  if (streak >= 14) return "text-orange-500";
  if (streak >= 7) return "text-amber-500";
  if (streak >= 1) return "text-yellow-500";
  return "text-muted-foreground";
}

export function StreakBadge({
  current,
  longest,
  weeklyGoalStreak,
  color,
}: Props) {
  const isHot = current >= 3;
  const accent = color ?? "hsl(var(--primary))";
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div
        className="relative overflow-hidden rounded-xl border bg-card p-4"
        style={
          isHot
            ? {
                backgroundImage: `radial-gradient(circle at top right, ${accent}22, transparent 60%)`,
              }
            : undefined
        }
      >
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Sequência
          </div>
          <HIcon
            name="flame"
            size={20}
            className={cn(flameColor(current), isHot && "animate-flame")}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-4xl font-bold leading-none tracking-tight font-tabular">
            <CountUp end={current} duration={0.6} preserveValue useEasing />
          </span>
          <span className="text-sm text-muted-foreground">
            {current === 1 ? "dia" : "dias"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Recorde
          </div>
          <HIcon name="trophy" size={20} className="text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="font-display text-4xl font-bold leading-none tracking-tight font-tabular">
            <CountUp end={longest} duration={0.6} preserveValue useEasing />
          </span>
          <span className="text-sm text-muted-foreground">
            {longest === 1 ? "dia" : "dias"}
          </span>
        </div>
      </div>

      {weeklyGoalStreak !== undefined && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Meta semanal
            </div>
            <HIcon name="target" size={20} className="text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display text-4xl font-bold leading-none tracking-tight font-tabular">
              <CountUp
                end={weeklyGoalStreak}
                duration={0.6}
                preserveValue
                useEasing
              />
            </span>
            <span className="text-sm text-muted-foreground">
              {weeklyGoalStreak === 1 ? "semana" : "semanas"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
