import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { HIcon } from "./icons/HIcon";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toDateKey, type DateKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { HeatmapEntry } from "./Heatmap";

interface Props {
  entries: HeatmapEntry[];
  color: string;
  onCellClick?: (date: Date) => void;
  onToggle?: (date: Date) => void;
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

const DOW_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MonthlyHeatmap({
  entries,
  color,
  onCellClick,
  onToggle,
  retroactiveLimitDays = 0,
}: Props) {
  const [viewMonth, setViewMonth] = useState<Date>(() => new Date());
  const byDate = useMemo(() => {
    const map = new Map<DateKey, { count: number; note?: string | null }>();
    for (const e of entries) map.set(e.date, { count: e.count, note: e.note });
    return map;
  }, [entries]);

  const maxCount = useMemo(
    () => entries.reduce((m, e) => (e.count > m ? e.count : m), 0),
    [entries],
  );

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewMonth]);

  const [r, g, b] = hexToRgb(color);
  const today = toDateKey(new Date());
  const retroLimitKey =
    retroactiveLimitDays > 0
      ? toDateKey(new Date(Date.now() - retroactiveLimitDays * 86_400_000))
      : null;

  const monthStart = startOfMonth(viewMonth);
  const inViewMonth = days.filter((d) => isSameMonth(d, viewMonth));
  const doneInView = inViewMonth.filter((d) => {
    const e = byDate.get(toDateKey(d));
    return (e?.count ?? 0) > 0;
  }).length;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-base font-semibold capitalize">
              {format(viewMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <div className="text-xs text-muted-foreground">
              {doneInView} de {inViewMonth.length} dias marcados
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              aria-label="Mês anterior"
              data-testid="monthly-prev"
            >
              <HIcon name="chevron-left" size={16} />
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
              data-testid="monthly-next"
            >
              <HIcon name="chevron-right" size={16} />
            </Button>
          </div>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {DOW_LABELS.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>

        <div
          className="grid grid-cols-7 gap-1.5"
          data-testid="monthly-heatmap-grid"
          role="grid"
          aria-label={`Marcações de ${format(viewMonth, "MMMM yyyy", { locale: ptBR })}`}
        >
          {days.map((d) => {
            const key = toDateKey(d);
            const entry = byDate.get(key);
            const count = entry?.count ?? 0;
            const hasNote = Boolean(entry?.note);
            const isDone = count > 0;
            const inMonth = isSameMonth(d, monthStart);
            const isFuture = key > today;
            const isTooOld = retroLimitKey ? key < retroLimitKey : false;
            const disabled = isFuture || isTooOld;
            const isToday = key === today;
            const alpha = isDone ? intensity(count, maxCount) : 0;
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
                      "relative grid aspect-square place-items-center rounded-lg border text-sm font-medium transition-all",
                      inMonth ? "opacity-100" : "opacity-30",
                      disabled && "pointer-events-none",
                      !disabled && "active:scale-95",
                      isDone && "text-foreground",
                      !isDone && inMonth && "text-muted-foreground",
                      isToday &&
                        "border-foreground/50 ring-2 ring-foreground/20 ring-offset-1 ring-offset-background",
                      !isToday &&
                        (isDone
                          ? "border-transparent"
                          : "border-border/60"),
                    )}
                    style={{
                      backgroundColor: bg,
                      color: isDone && alpha > 0.5 ? "white" : undefined,
                    }}
                    aria-label={`${format(d, "d 'de' MMMM", { locale: ptBR })} ${isDone ? `marcado${count > 1 ? ` ${count}x` : ""}` : "não marcado"}${hasNote ? " (com nota)" : ""}`}
                    role="gridcell"
                  >
                    {getDate(d)}
                    {hasNote && (
                      <span
                        className="absolute h-1 w-1 rounded-full bg-foreground/80"
                        style={{ top: 4, right: 4 }}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-xs font-medium capitalize">
                    {format(d, "EEEE, d 'de' MMM", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground">
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
                    <div className="mt-1 max-w-[200px] border-t pt-1 text-xs italic text-muted-foreground">
                      “{entry.note}”
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
          <span>Menos</span>
          {[0.08, 0.28, 0.48, 0.72, 1].map((a, i) => (
            <div
              key={i}
              className="h-3 w-3 rounded"
              style={{
                backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
              }}
            />
          ))}
          <span>Mais</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
