import { HIcon, type IconName } from "./icons/HIcon";
import { MILESTONES } from "@/lib/streak";
import { cn } from "@/lib/utils";

const ICONS: Record<number, IconName> = {
  3: "sparkles",
  7: "flame",
  14: "flame",
  30: "medal",
  60: "medal",
  100: "trophy",
  180: "trophy",
  365: "trophy",
  730: "trophy",
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
          next && MILESTONES.find((x) => x > currentStreak) === m;
        const iconName = ICONS[m] ?? "medal";
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
            <HIcon name={iconName} size={12} />
            {m}d
          </div>
        );
      })}
    </div>
  );
}
