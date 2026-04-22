import { addDays, differenceInCalendarDays } from "date-fns";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  MILESTONES,
} from "./streak";
import { fromDateKey, toDateKey, type DateKey } from "./date";
import type { CompletionRecord, WeeklyCount } from "@/db/queries";

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export interface InsightInput {
  completions: CompletionRecord[];
  weekly: WeeklyCount[];
  targetPerWeek: number;
  today?: DateKey;
}

export interface Insight {
  id: string;
  kind: "success" | "info" | "warning" | "milestone";
  text: string;
}

/**
 * Gera 2-4 insights curtos em linguagem natural a partir dos dados. Pura,
 * determinística — testável.
 */
export function generateInsights(input: InsightInput): Insight[] {
  const today = input.today ?? toDateKey(new Date());
  const completedDates = input.completions.map((c) => c.date);
  const completionSet = new Set(completedDates);
  const out: Insight[] = [];

  // 1. Últimos 30 dias
  const thirtyStart = toDateKey(addDays(fromDateKey(today), -29));
  const last30 = completedDates.filter((d) => d >= thirtyStart && d <= today);
  if (last30.length > 0) {
    out.push({
      id: "last-30",
      kind: "info",
      text: `Você marcou **${last30.length} de 30 dias** no último mês.`,
    });
  } else if (completedDates.length === 0) {
    out.push({
      id: "empty",
      kind: "info",
      text: "Sem marcações ainda. Comece marcando hoje.",
    });
    return out;
  }

  // 2. Melhor sequência histórica
  const longest = calculateLongestStreak(completedDates);
  const current = calculateCurrentStreak(completedDates, today);
  if (longest >= 3 && longest > current) {
    out.push({
      id: "longest",
      kind: "info",
      text: `Sua melhor sequência foi de **${longest} dias** consecutivos.`,
    });
  }

  // 3. Próxima milestone
  const nextMilestone = MILESTONES.find((m) => m > current);
  if (current > 0 && nextMilestone) {
    const away = nextMilestone - current;
    if (away <= 5) {
      out.push({
        id: "milestone",
        kind: "milestone",
        text: `Você está a **${away} dia${away === 1 ? "" : "s"}** de alcançar ${nextMilestone} dias consecutivos.`,
      });
    }
  }

  // 4. Comparação semanal (últimas 2 semanas completas)
  if (input.weekly.length >= 2) {
    const last = input.weekly[input.weekly.length - 1];
    const prev = input.weekly[input.weekly.length - 2];
    const delta = last.count - prev.count;
    if (delta > 0) {
      out.push({
        id: "trend-up",
        kind: "success",
        text: `Esta semana você já marcou **${delta} ${delta === 1 ? "vez a mais" : "vezes a mais"}** que a passada.`,
      });
    } else if (delta < 0 && prev.count >= 3) {
      out.push({
        id: "trend-down",
        kind: "warning",
        text: `Você caiu **${Math.abs(delta)}** marcação${Math.abs(delta) === 1 ? "" : "ões"} em relação à semana anterior.`,
      });
    } else if (
      delta === 0 &&
      last.count >= input.targetPerWeek &&
      prev.count >= input.targetPerWeek
    ) {
      out.push({
        id: "consistency",
        kind: "success",
        text: `Você bateu a meta **duas semanas seguidas**.`,
      });
    }
  }

  // 5. Dia da semana mais forte (se tiver dados razoáveis)
  if (completedDates.length >= 7) {
    const counts = new Array(7).fill(0);
    for (const d of completedDates) {
      counts[fromDateKey(d).getDay()] += 1;
    }
    const max = Math.max(...counts);
    const top = counts.indexOf(max);
    if (max >= 3) {
      const totalDays = Math.max(1, daysSinceFirst(completedDates, today));
      const dowOccurrences = Math.max(1, Math.round(totalDays / 7));
      const rate = max / dowOccurrences;
      if (rate >= 0.55) {
        out.push({
          id: "best-day",
          kind: "info",
          text: `Seu dia mais forte é **${WEEKDAYS[top]}** — cai bem menos nos outros dias.`,
        });
      }
    }
  }

  // 6. Ainda não marcado hoje, mas ontem sim
  if (!completionSet.has(today)) {
    const yesterday = toDateKey(addDays(fromDateKey(today), -1));
    if (completionSet.has(yesterday) && current > 0) {
      out.push({
        id: "today-pending",
        kind: "warning",
        text: `Você ainda **não marcou hoje**. Marque até o fim do dia para manter a sequência de ${current}.`,
      });
    }
  }

  // 7. Primeiro passo: fez por N dias seguidos pela primeira vez
  if (current >= 2 && current === longest && current < 7) {
    out.push({
      id: "first-streak",
      kind: "success",
      text: `Você está criando o hábito — **${current} dias seguidos** e contando.`,
    });
  }

  // Limita a 4 insights mais relevantes
  return out.slice(0, 4);
}

function daysSinceFirst(dates: string[], today: string): number {
  if (dates.length === 0) return 0;
  const first = dates.reduce((a, b) => (a < b ? a : b));
  return differenceInCalendarDays(fromDateKey(today), fromDateKey(first)) + 1;
}
