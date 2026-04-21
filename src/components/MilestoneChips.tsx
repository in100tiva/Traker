import { Award, Flame, Medal, Sparkles, Trophy } from "lucide-react";
import { MILESTONES } from "@/lib/streak";
import { cn } from "@/lib/utils";

const ICONS: Record<number, React.ComponentType<{ className?: string }>> = {
  3: Sparkles,
  7: Flame,
  14: Flame,
  30: Medal,
  60: Medal,
  100: Trophy,
  180: Trophy,
  365: Award,
  730: Award,
};

interface Props {
  currentStreak: number;
  color?: string;
}

export function MilestoneChips({ currentStreak, color }: Props) {
  const accent = color ?? "hsl(var(--primary))";
  return (
    <div className="flex flex-wrap gap-1.5">
      {MILESTONES.map((m) => {
        const achieved = currentStreak >= m;
        const next = !achieved && currentStreak < m;
        const isNext =
          next &&
          MILESTONES.find((x) => x > currentStreak) === m;
        const Icon = ICONS[m] ?? Medal;
        return (
          <div
            key={m}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
              achieved
                ? "border-transparent text-white shadow-card"
                : isNext
                  ? "border-dashed border-foreground/30 text-foreground"
                  : "border-transparent bg-muted text-muted-foreground",
            )}
            style={achieved ? { backgroundColor: accent } : undefined}
            aria-label={`${m} dias ${achieved ? "atingidos" : "pendente"}`}
          >
            <Icon className="h-3 w-3" />
            {m}d
          </div>
        );
      })}
    </div>
  );
}
