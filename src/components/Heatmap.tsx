import { useMemo } from "react";
import { format, parseISO, startOfWeek, addDays } from "date-fns";
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

interface Props {
  completions: DateKey[];
  color: string;
  onToggle?: (date: Date) => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function Heatmap({ completions, color, onToggle }: Props) {
  const completedSet = useMemo(() => new Set(completions), [completions]);

  const cells = useMemo(() => {
    const today = new Date();
    const gridStart = startOfWeek(
      addDays(today, -(TOTAL_DAYS - 1)),
      { weekStartsOn: 0 },
    );
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
        >
          {cells.map((d) => {
            const key = toDateKey(d);
            const inRange = validRange.has(key);
            const isDone = completedSet.has(key);
            const isFuture = d > new Date();
            const bg = isDone
              ? `rgba(${r}, ${g}, ${b}, 1)`
              : inRange
                ? `rgba(${r}, ${g}, ${b}, 0.08)`
                : "transparent";
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
                    aria-label={`${key} ${isDone ? "feito" : "não feito"}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    {format(parseISO(key), "d 'de' MMMM, yyyy", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isDone ? "Feito ✓" : isFuture ? "—" : "Não feito"}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Menos</span>
          {[0.08, 0.3, 0.55, 0.8, 1].map((a, i) => (
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

