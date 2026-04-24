import { useEffect, useState } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProgressRing } from "./ProgressRing";
import { cn } from "@/lib/utils";
import { toDateKey } from "@/lib/date";

interface Props {
  /** Habits scheduled for today (active and not paused). */
  total: number;
  done: number;
  /** Longest current streak across habits (with habit name). */
  maxStreak: number;
  maxStreakHabit?: string;
  /** Sum of completions this week + weekly target total. */
  weekDone: number;
  weekGoal: number;
  /** Boolean per day of the current week (S M T W T F S). */
  weekCompleted: boolean[];
}

function greetingFor(hour: number): string {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function Hero({
  total,
  done,
  maxStreak,
  maxStreakHabit,
  weekDone,
  weekGoal,
  weekCompleted,
}: Props) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const pending = total - done;
  const weekdayLabel = format(now, "EEEE", { locale: ptBR });
  const greeting = greetingFor(now.getHours());

  // For the 7-dot week indicator
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = toDateKey(d);
    const today = toDateKey(now);
    return {
      completed: weekCompleted[i] ?? false,
      isToday: key === today,
    };
  });

  return (
    <div className="grid grid-cols-1 gap-5 rounded-xl border border-border bg-surface p-6 md:grid-cols-[1.1fr_1fr_1fr_1fr] md:gap-6 md:p-7">
      {/* Col 1 — Greeting */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-ink-mute">
          Hoje · {weekdayLabel}
        </div>
        <div className="mt-2 font-display text-[30px] font-bold leading-[1.1] text-ink tracking-tightest md:text-[34px]">
          {greeting},
          <br />
          <span>Luan</span>
        </div>
        <div className="mt-3 max-w-[300px] text-[14px] leading-[1.45] text-ink-dim">
          {total === 0
            ? "Crie seu primeiro hábito para começar a rastrear."
            : pending === 0
              ? "Tudo feito por hoje — dia redondo 🎉"
              : `${pending} ${pending === 1 ? "hábito ainda em aberto" : "hábitos ainda em aberto"} — um empurrãozinho e o dia fecha.`}
        </div>
      </div>

      {/* Col 2 — Progress ring + completion */}
      <div className="flex items-center gap-5 md:pl-3">
        <ProgressRing
          value={pct}
          size={96}
          stroke={7}
        >
          <div className="text-center leading-none">
            <div className="font-display text-[22px] font-bold text-ink tracking-tighter">
              {pct}%
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-ink-mute">
              FEITO
            </div>
          </div>
        </ProgressRing>
        <div>
          <div className="font-display text-[36px] font-bold leading-none tracking-tightest text-ink">
            {done}
            <span className="text-[20px] font-medium text-ink-mute">
              {" "}/ {total}
            </span>
          </div>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
            Conclusão diária
          </div>
        </div>
      </div>

      {/* Col 3 — Max streak */}
      <div className="md:border-l md:border-border md:pl-6">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
          Maior sequência
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <div className="font-display text-[36px] font-bold leading-none tracking-tightest text-accent">
            {maxStreak}
          </div>
          <div className="font-mono text-[13px] text-ink-dim">dias</div>
        </div>
        <div className="mt-1.5 font-mono text-[10.5px] text-ink-dim">
          {maxStreakHabit ? `${maxStreakHabit} · em andamento` : "—"}
        </div>
      </div>

      {/* Col 4 — This week */}
      <div className="md:border-l md:border-border md:pl-6">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
          Esta semana
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <div className="font-display text-[36px] font-bold leading-none tracking-tightest text-ink">
            {weekDone}
          </div>
          <div className="font-mono text-[13px] text-ink-dim">
            / {weekGoal}
          </div>
        </div>
        <div className="mt-2.5 flex gap-1">
          {weekDots.map((c, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-pill",
                c.completed ? "bg-accent" : "bg-surface-3",
                c.isToday && !c.completed && "bg-surface-3 ring-1 ring-accent/30",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
