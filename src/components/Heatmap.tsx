import { useMemo, useState, useEffect } from "react";
import {
  format,
  parseISO,
  endOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { lastNDays, toDateKey, type DateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEKS = 53;
const TOTAL_DAYS = WEEKS * 7;

export interface HeatmapEntry {
  date: DateKey;
  count: number;
  note?: string | null;
}

interface Props {
  entries: HeatmapEntry[];
  color: string;
  onToggle?: (date: Date) => void;
  onCellClick?: (date: Date) => void;
  retroactiveLimitDays?: number; // 0 = unlimited
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function intensity(count: number, max: number): number {
  if (count <= 0) return 0.08;
  if (max <= 1) return 1;
  const ratio = count / max;
  if (ratio <= 0.25) return 0.35;
  if (ratio <= 0.5) return 0.6;
  if (ratio <= 0.75) return 0.8;
  return 1;
}

export function Heatmap({
  entries,
  color,
  onToggle,
  onCellClick,
  retroactiveLimitDays = 0,
}: Props) {
  const byDate = useMemo(() => {
    const map = new Map<DateKey, { count: number; note?: string | null }>();
    for (const e of entries) map.set(e.date, { count: e.count, note: e.note });
    return map;
  }, [entries]);

  const maxCount = useMemo(
    () => entries.reduce((m, e) => (e.count > m ? e.count : m), 0),
    [entries],
  );

  // Month navigation — highlights the selected month within the yearly grid.
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());

  useEffect(() => {
    // Reset to current month whenever entries change drastically (new habit)
    setViewMonth(new Date());
  }, [entries.length === 0]);

  const cells = useMemo(() => {
    const today = new Date();
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
  const validRange = useMemo(
    () => new Set(lastNDays(new Date(), TOTAL_DAYS)),
    [],
  );
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);

  const retroLimitKey = useMemo(() => {
    if (!retroactiveLimitDays || retroactiveLimitDays <= 0) return null;
    return toDateKey(addDays(new Date(), -retroactiveLimitDays));
  }, [retroactiveLimitDays]);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">
            {format(viewMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              aria-label="Mês anterior"
              data-testid="heatmap-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMonth(new Date())}
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="Próximo mês"
              data-testid="heatmap-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div
          className="grid grid-flow-col grid-rows-7 gap-[3px] overflow-x-auto"
          style={{ gridAutoColumns: "min-content" }}
          data-testid="heatmap-grid"
          role="grid"
          aria-label="Heatmap de completude diária"
        >
          {cells.map((d, i) => {
            const key = toDateKey(d);
            const inRange = validRange.has(key);
            const entry = byDate.get(key);
            const count = entry?.count ?? 0;
            const hasNote = Boolean(entry?.note);
            const isDone = count > 0;
            const isFuture = key > today;
            const isTooOld = retroLimitKey ? key < retroLimitKey : false;
            const inViewMonth = isWithinInterval(d, {
              start: monthStart,
              end: monthEnd,
            });
            const disabled = isFuture || isTooOld;
            const alpha = isDone
              ? intensity(count, maxCount)
              : inRange
                ? 0.08
                : 0;
            const bg =
              alpha > 0 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : "transparent";
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      if (onCellClick) onCellClick(d);
                      else onToggle?.(d);
                    }}
                    className={cn(
                      "relative h-[11px] w-[11px] rounded-[2px] border border-transparent transition-colors",
                      !disabled && "hover:ring-1 hover:ring-ring/50",
                      key === today && "ring-1 ring-foreground/60",
                      inViewMonth && "ring-1 ring-foreground/20",
                    )}
                    style={{ backgroundColor: bg }}
                    aria-label={`${key} ${isDone ? `contagem ${count}` : "não feito"}${hasNote ? " (com nota)" : ""}`}
                    role="gridcell"
                    aria-rowindex={(i % 7) + 1}
                    aria-colindex={Math.floor(i / 7) + 1}
                  >
                    {hasNote && (
                      <span className="pointer-events-none absolute -right-0.5 -top-0.5 h-[4px] w-[4px] rounded-full bg-foreground/80" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {format(parseISO(key), "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isFuture
                      ? "—"
                      : isTooOld
                        ? "Retroativo bloqueado"
                        : isDone
                          ? count === 1
                            ? "Feito ✓"
                            : `Feito (${count}x)`
                          : "Não feito"}
                  </div>
                  {entry?.note && (
                    <div className="mt-1 max-w-[200px] border-t pt-1 text-xs italic">
                      “{entry.note}”
                    </div>
                  )}
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
