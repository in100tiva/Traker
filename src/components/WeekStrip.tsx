import { addDays, startOfWeek } from "date-fns";
import { HIcon } from "./icons/HIcon";
import { toDateKey, type DateKey } from "@/lib/date";
import {
  ALL_DAYS_SCHEDULE,
  isScheduledOnDow,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

const WEEK_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

interface Props {
  completedDates: DateKey[];
  size?: number;
  schedule?: number;
}

export function WeekStrip({
  completedDates,
  size = 32,
  schedule = ALL_DAYS_SCHEDULE,
}: Props) {
  const today = toDateKey(new Date());
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday
  const set = new Set(completedDates);

  const cells = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = toDateKey(d);
    return {
      key,
      label: WEEK_LABELS[i],
      done: set.has(key),
      isToday: key === today,
      isFuture: key > today,
      isScheduled: isScheduledOnDow(schedule, d.getDay()),
    };
  });

  return (
    <div className="flex w-full items-start justify-between gap-1.5">
      {cells.map((c, i) => (
        <div
          key={c.key}
          className="flex flex-1 flex-col items-center gap-1.5"
        >
          <div className="font-mono text-[9px] uppercase tracking-wide text-ink-mute">
            {c.label}
          </div>
          <div
            className={cn(
              "flex items-center justify-center rounded-full font-mono text-[10px] font-semibold transition-colors",
              c.done
                ? "bg-accent text-[rgb(10,10,10)]"
                : "bg-surface-2 text-ink-mute",
              !c.done && "border border-border",
              c.isToday &&
                "outline outline-1 outline-offset-2 outline-accent/40",
              !c.isScheduled && !c.done && "opacity-50",
            )}
            style={{ width: size, height: size }}
          >
            {c.done ? (
              <HIcon name="check" size={size * 0.44} strokeWidth={2.5} />
            ) : (
              i + 1
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
