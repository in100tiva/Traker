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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { HIcon } from "./icons/HIcon";
import { fromDateKey, lastNDays, toDateKey, type DateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

const WEEKS = 20; // last 20 weeks like the design
const TOTAL_DAYS = WEEKS * 7;
const CELL_SIZE = 14;
const CELL_GAP = 3;

export interface HeatmapEntry {
  date: DateKey;
  count: number;
  note?: string | null;
}

interface Props {
  entries: HeatmapEntry[];
  onToggle?: (date: Date) => void;
  onCellClick?: (date: Date) => void;
  retroactiveLimitDays?: number;
  compact?: boolean;
  showMonthNav?: boolean;
  showLegend?: boolean;
}

const SCALE_VARS = [
  "rgb(var(--hm-0))",
  "rgb(var(--hm-1))",
  "rgb(var(--hm-2))",
  "rgb(var(--hm-3))",
  "rgb(var(--hm-4))",
] as const;

/** Map a count (0..max) to a 0-4 index in the yellow scale. */
function levelFor(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]; // placeholder, overridden below
const PT_WEEKDAY = ["D", "S", "T", "Q", "Q", "S", "S"];

export function Heatmap({
  entries,
  onToggle,
  onCellClick,
  retroactiveLimitDays = 0,
  compact = false,
  showMonthNav = true,
  showLegend = true,
}: Props) {
  const cellSize = compact ? 9 : CELL_SIZE;
  const cellGap = compact ? 2.5 : CELL_GAP;

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

  const cells = useMemo(() => {
    const today = new Date();
    const gridEnd = endOfWeek(today, { weekStartsOn: 0 });
    const gridStart = addDays(gridEnd, -(TOTAL_DAYS - 1));
    const days: Date[] = [];
    for (let i = 0; i < TOTAL_DAYS; i++) days.push(addDays(gridStart, i));
    return days;
  }, []);

  const today = toDateKey(new Date());
  const validRange = useMemo(
    () => new Set(lastNDays(new Date(), TOTAL_DAYS)),
    [],
  );
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);

  const retroLimitKey =
    retroactiveLimitDays > 0
      ? toDateKey(addDays(new Date(), -retroactiveLimitDays))
      : null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col gap-3">
        {showMonthNav && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display text-[15px] font-semibold text-ink capitalize leading-tight">
                {format(viewMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <div className="mt-0.5 font-mono text-[10.5px] text-ink-dim">
                Últimas {WEEKS} semanas
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
                <HIcon name="chevron-left" size={14} />
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
                <HIcon name="chevron-right" size={14} />
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 items-start overflow-x-auto pb-1">
          <div
            className="grid"
            style={{
              gridTemplateRows: `repeat(7, ${cellSize}px)`,
              rowGap: cellGap,
            }}
          >
            {PT_WEEKDAY.map((d, i) => (
              <div
                key={i}
                className="flex items-center font-mono text-[9px] uppercase tracking-wide text-ink-mute pr-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div
            className="grid grid-flow-col"
            style={{
              gridAutoColumns: "min-content",
              gridTemplateRows: `repeat(7, ${cellSize}px)`,
              gap: cellGap,
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
              const level = isDone
                ? levelFor(count, maxCount)
                : inRange
                  ? 0
                  : -1;
              const bg =
                level < 0 ? "transparent" : SCALE_VARS[level];

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
                      disabled={disabled || (!onToggle && !onCellClick)}
                      onClick={() => {
                        if (disabled) return;
                        if (onCellClick) onCellClick(d);
                        else onToggle?.(d);
                      }}
                      onMouseEnter={() => setHoverCell({ row, col })}
                      className={cn(
                        "relative transition-all",
                        !disabled &&
                          (onToggle || onCellClick) &&
                          "cursor-pointer hover:ring-2 hover:ring-accent/40",
                        isToday &&
                          "ring-1 ring-offset-2 ring-offset-bg ring-accent/50",
                        inCrosshair &&
                          !isToday &&
                          "ring-1 ring-[rgb(255,255,255,0.2)]",
                      )}
                      style={{
                        backgroundColor: bg,
                        width: cellSize,
                        height: cellSize,
                        borderRadius: Math.max(2, cellSize * 0.22),
                        opacity: inViewMonth || level > 0 ? 1 : 0.6,
                      }}
                      aria-label={`${key} ${
                        isDone ? `contagem ${count}` : "não feito"
                      }${hasNote ? " (com nota)" : ""}`}
                      role="gridcell"
                      aria-rowindex={row + 1}
                      aria-colindex={col + 1}
                    >
                      {hasNote && (
                        <span
                          className="pointer-events-none absolute rounded-full bg-[rgb(10,10,10)]"
                          style={{
                            top: 2,
                            right: 2,
                            width: 4,
                            height: 4,
                          }}
                        />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="px-3 py-2">
                    <div className="font-mono text-[11px] font-medium capitalize text-ink">
                      {format(fromDateKey(key), "EEEE, d 'de' MMM", {
                        locale: ptBR,
                      })}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-ink-dim">
                      {isFuture
                        ? "—"
                        : isTooOld
                          ? "Retroativo bloqueado"
                          : isDone
                            ? count === 1
                              ? "Feito ✓"
                              : `Feito ${count}×`
                            : "Não feito"}
                    </div>
                    {entry?.note && (
                      <div className="mt-1 max-w-[220px] border-t border-border pt-1 text-[11px] italic text-ink-dim">
                        "{entry.note}"
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {showLegend && (
          <div className="flex items-center justify-end gap-1.5 font-mono text-[9px] uppercase tracking-wide text-ink-mute">
            Menos
            {SCALE_VARS.map((c, i) => (
              <div
                key={i}
                style={{
                  width: cellSize - 4,
                  height: cellSize - 4,
                  borderRadius: 2,
                  backgroundColor: c,
                }}
              />
            ))}
            Mais
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// keep import parity for other files
export { WEEKDAY_LABELS };
