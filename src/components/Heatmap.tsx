import { useMemo, useState, useEffect } from "react";
import {
  format,
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
import { fromDateKey, lastNDays, toDateKey, type DateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEKS = 53;
const TOTAL_DAYS = WEEKS * 7;
const CELL_SIZE = 14; // was 11
const CELL_GAP = 3;

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
  retroactiveLimitDays?: number;
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
  if (ratio <= 0.25) return 0.28;
  if (ratio <= 0.5) return 0.48;
  if (ratio <= 0.75) return 0.72;
  return 1;
}

const WEEKDAY_SHORT = ["", "Seg", "", "Qua", "", "Sex", ""];

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

  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(
    null,
  );

  useEffect(() => {
    setViewMonth(new Date());
  }, [entries.length === 0]);

  const { cells, monthLabels } = useMemo(() => {
    const today = new Date();
    const gridEnd = endOfWeek(today, { weekStartsOn: 0 });
    const gridStart = addDays(gridEnd, -(TOTAL_DAYS - 1));
    const days: Date[] = [];
    for (let i = 0; i < TOTAL_DAYS; i++) days.push(addDays(gridStart, i));
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let col = 0; col < WEEKS; col++) {
      const firstOfCol = days[col * 7];
      const m = firstOfCol.getMonth();
      if (m !== lastMonth) {
        labels.push({
          col,
          label: format(firstOfCol, "MMM", { locale: ptBR }),
        });
        lastMonth = m;
      }
    }
    return { cells: days, monthLabels: labels };
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

  const totalInView = cells.filter(
    (d) => isWithinInterval(d, { start: monthStart, end: monthEnd }),
  ).length;
  const doneInView = cells.filter((d) => {
    if (!isWithinInterval(d, { start: monthStart, end: monthEnd })) return false;
    return (byDate.get(toDateKey(d))?.count ?? 0) > 0;
  }).length;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-display text-base font-semibold capitalize">
              {format(viewMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <div className="text-xs text-muted-foreground">
              {doneInView} de {totalInView} dias marcados neste mês
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="iconSm"
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
              size="iconSm"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="Próximo mês"
              data-testid="heatmap-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <div
            className="grid text-[10px] text-muted-foreground"
            style={{
              gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
              rowGap: CELL_GAP,
              marginTop: 16, // match month labels bar height
            }}
          >
            {WEEKDAY_SHORT.map((label, i) => (
              <div key={i} className="flex items-center pr-1">
                {label}
              </div>
            ))}
          </div>
          <div className="relative">
            <div
              className="flex text-[10px] text-muted-foreground"
              style={{ height: 16 }}
            >
              {monthLabels.map((m) => (
                <div
                  key={m.col}
                  className="absolute"
                  style={{
                    left: m.col * (CELL_SIZE + CELL_GAP),
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            <div
              className="grid grid-flow-col"
              style={{
                gridAutoColumns: "min-content",
                gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
                gap: CELL_GAP,
              }}
              data-testid="heatmap-grid"
              role="grid"
              aria-label="Heatmap de completude diária"
              onMouseLeave={() => setHoverCell(null)}
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

                const row = i % 7;
                const col = Math.floor(i / 7);
                const inCrosshair =
                  hoverCell && (hoverCell.row === row || hoverCell.col === col);
                const isToday = key === today;

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
                        onMouseEnter={() => setHoverCell({ row, col })}
                        className={cn(
                          "relative rounded-[3px] border transition-all",
                          !disabled && "cursor-pointer hover:ring-2 hover:ring-ring/50",
                          isToday && "animate-today-glow",
                          inCrosshair && !isToday && "ring-1 ring-foreground/30",
                          inViewMonth && !isToday
                            ? "border-foreground/10"
                            : "border-transparent",
                        )}
                        style={{
                          backgroundColor: bg,
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                        }}
                        aria-label={`${key} ${isDone ? `contagem ${count}` : "não feito"}${hasNote ? " (com nota)" : ""}`}
                        role="gridcell"
                        aria-rowindex={row + 1}
                        aria-colindex={col + 1}
                      >
                        {hasNote && (
                          <span
                            className="pointer-events-none absolute h-[4px] w-[4px] rounded-full bg-foreground/90"
                            style={{ top: 2, right: 2 }}
                          />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="px-3 py-2">
                      <div className="text-xs font-medium capitalize">
                        {format(fromDateKey(key), "EEEE, d 'de' MMM", {
                          locale: ptBR,
                        })}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span
                          className="h-2 w-2 rounded-sm"
                          style={{ backgroundColor: color, opacity: isDone ? 1 : 0.2 }}
                        />
                        <span className="text-muted-foreground">
                          {isFuture
                            ? "—"
                            : isTooOld
                              ? "Retroativo bloqueado"
                              : isDone
                                ? count === 1
                                  ? "Feito ✓"
                                  : `Feito ${count}×`
                                : "Não feito"}
                        </span>
                      </div>
                      {entry?.note && (
                        <div className="mt-1 max-w-[220px] border-t pt-1 text-xs italic text-muted-foreground">
                          “{entry.note}”
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
          <span>Menos</span>
          {[0.08, 0.28, 0.48, 0.72, 1].map((a, i) => (
            <div
              key={i}
              className="rounded-[3px]"
              style={{
                backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
              }}
            />
          ))}
          <span>Mais</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
