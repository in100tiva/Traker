import { motion } from "framer-motion";
import { addDays, startOfWeek } from "date-fns";
import { toDateKey, type DateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

interface Props {
  /** Dates completed in the current week (any format, we dedupe). */
  completedDates: DateKey[];
  color?: string;
  target?: number;
}

const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

export function WeeklyProgressDots({ completedDates, color, target }: Props) {
  const accent = color ?? "hsl(var(--primary))";
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const today = toDateKey(new Date());
  const set = new Set(completedDates);

  const cells = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = toDateKey(d);
    return {
      key,
      label: WEEKDAY_LABELS[i],
      done: set.has(key),
      isToday: key === today,
      isFuture: key > today,
    };
  });

  const doneCount = cells.filter((c) => c.done).length;
  const goalHit = target !== undefined && doneCount >= target;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
        <span>Esta semana</span>
        <span className={cn("font-medium", goalHit && "text-primary")}>
          {doneCount}
          {target !== undefined ? `/${target}` : ""}
          {goalHit && " 🎯"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {cells.map((c, i) => (
          <div key={c.key} className="flex flex-1 flex-col items-center gap-1">
            <motion.div
              initial={{ scale: 0.85, opacity: 0.8 }}
              animate={{
                scale: c.done ? 1 : 0.92,
                opacity: c.done ? 1 : 0.6,
              }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 220 }}
              className={cn(
                "relative h-6 w-full rounded-md border-2 transition-colors",
                c.isToday && "ring-2 ring-offset-1 ring-offset-background",
              )}
              style={{
                backgroundColor: c.done ? accent : "transparent",
                borderColor: c.done
                  ? accent
                  : c.isFuture
                    ? "hsl(var(--border))"
                    : "hsl(var(--muted-foreground) / 0.3)",
              }}
            />
            <span
              className={cn(
                "text-[10px] font-medium",
                c.isToday
                  ? "text-foreground"
                  : "text-muted-foreground/70",
              )}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
