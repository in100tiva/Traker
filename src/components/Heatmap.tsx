import { useMemo } from "react";
import { format, parseISO, endOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { lastNDays, toDateKey, type DateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEKS = 53;
const TOTAL_DAYS = WEEKS * 7;

export interface HeatmapEntry {
  date: DateKey;
  count: number;
}

interface Props {
  entries: HeatmapEntry[];
  color: string;
  onToggle?: (date: Date) => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Map a count to an opacity bucket (0.25 / 0.5 / 0.75 / 1). */
function intensity(count: number, max: number): number {
  if (count <= 0) return 0.08;
  if (max <= 1) return 1;
  const ratio = count / max;
  if (ratio <= 0.25) return 0.35;
  if (ratio <= 0.5) return 0.6;
  if (ratio <= 0.75) return 0.8;
  return 1;
}

export function Heatmap({ entries, color, onToggle }: Props) {
  const byDate = useMemo(() => {
    const map = new Map<DateKey, number>();
    for (const e of entries) map.set(e.date, e.count);
    return map;
  }, [entries]);

  const maxCount = useMemo(
    () => entries.reduce((m, e) => (e.count > m ? e.count : m), 0),
    [entries],
  );

  const cells = useMemo(() => {
    const today = new Date();
    // Anchor grid to end of current week (Saturday, Sun-based) so today is
    // always inside the grid; then back-fill TOTAL_DAYS cells.
    const gridEnd = endOfWeek(today, { weekStartsOn: 0 });
    const gridStart = addDays(gridEnd, -(TOTAL_DAYS - 1));
    const days: Date[] = [];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      days.push(addDays(gridStart, i));
    }
    return days;
  }, []);

  const [r, g, b] = hexToRgb(color);
  const today = toDateKey(new Date());
  const validRange = new Set(lastNDays(new Date(), TOTAL_DAYS));

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col gap-2">
        <div
          className="grid grid-flow-col grid-rows-7 gap-[3px]"
          style={{ gridAutoColumns: "min-content" }}
          data-testid="heatmap-grid"
        >
          {cells.map((d) => {
            const key = toDateKey(d);
            const inRange = validRange.has(key);
            const count = byDate.get(key) ?? 0;
            const isDone = count > 0;
            const isFuture = key > today;
            const alpha = isDone ? intensity(count, maxCount) : inRange ? 0.08 : 0;
            const bg =
              alpha > 0 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : "transparent";
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={isFuture}
                    onClick={() => !isFuture && onToggle?.(d)}
                    className={cn(
                      "h-[11px] w-[11px] rounded-[2px] border border-transparent transition-colors",
                      !isFuture && "hover:ring-1 hover:ring-ring/50",
                      key === today && "ring-1 ring-foreground/40",
                    )}
                    style={{ backgroundColor: bg }}
                    aria-label={`${key} ${isDone ? `contagem ${count}` : "não feito"}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {format(parseISO(key), "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isFuture
                      ? "—"
                      : isDone
                        ? count === 1
                          ? "Feito ✓"
                          : `Feito (${count}x)`
                        : "Não feito"}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Menos</span>
          {[0.08, 0.35, 0.6, 0.8, 1].map((a, i) => (
            <div
              key={i}
              className="h-[11px] w-[11px] rounded-[2px]"
              style={{ backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})` }}
            />
          ))}
          <span>Mais</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
