import { useEffect, useMemo, useState } from "react";
import type { Habit } from "@/db/schema";
import type { DbBundle } from "@/db/client";
import { HIcon } from "./icons/HIcon";
import { IconTile } from "./IconTile";
import { generateInsights, type Insight } from "@/lib/insights";
import { calculateCurrentStreak, calculateLongestStreak } from "@/lib/streak";
import { ALL_DAYS_SCHEDULE } from "@/lib/schedule";
import { toDateKey, todayKey, type DateKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import { addDays } from "date-fns";

interface Props {
  bundle: DbBundle | null;
  habits: Habit[];
}

type AggregatedInsight = Insight & {
  tone: "positive" | "warning" | "insight";
};

/**
 * Promote semantic insights from the lib to the design's positive/warning/
 * insight palette.
 */
function toneFor(kind: Insight["kind"]): AggregatedInsight["tone"] {
  switch (kind) {
    case "success":
    case "info":
    case "milestone":
      return "positive";
    case "warning":
      return "warning";
    default:
      return "insight";
  }
}

export function AnalyticsView({ bundle, habits }: Props) {
  const today = todayKey();
  const [allDates, setAllDates] = useState<{ [id: string]: DateKey[] }>({});
  const [totalCompletions, setTotalCompletions] = useState(0);

  useEffect(() => {
    if (!bundle || habits.length === 0) return;
    let cancelled = false;
    (async () => {
      const map: { [id: string]: DateKey[] } = {};
      let total = 0;
      for (const h of habits) {
        const { rows } = await bundle.pg.query<{ date: string }>(
          `SELECT date::text AS date FROM completions
             WHERE habit_id = $1 ORDER BY date ASC LIMIT 2000`,
          [h.id],
        );
        map[h.id] = rows.map((r) => r.date);
        total += rows.length;
      }
      if (!cancelled) {
        setAllDates(map);
        setTotalCompletions(total);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bundle, habits]);

  const insights = useMemo<AggregatedInsight[]>(() => {
    if (habits.length === 0) return [];
    // Merge insights from the habit with most data
    const sorted = [...habits].sort(
      (a, b) => (allDates[b.id]?.length ?? 0) - (allDates[a.id]?.length ?? 0),
    );
    const results: AggregatedInsight[] = [];
    for (const h of sorted) {
      const dates = allDates[h.id] ?? [];
      if (dates.length === 0) continue;
      const ins = generateInsights({
        completions: dates.map((d) => ({ date: d, count: 1, note: null })),
        weekly: [],
        targetPerWeek: h.targetPerWeek,
        today,
      });
      for (const i of ins.slice(0, 2)) {
        results.push({
          ...i,
          tone: toneFor(i.kind),
          text: `${h.emoji ?? "•"} ${h.name}: ${i.text}`,
        });
      }
      if (results.length >= 6) break;
    }
    return results.slice(0, 6);
  }, [habits, allDates, today]);

  const bestHabit = useMemo(() => {
    let best: { habit: Habit; streak: number } | null = null;
    for (const h of habits) {
      const dates = allDates[h.id] ?? [];
      const s = calculateCurrentStreak(
        dates,
        today,
        h.schedule ?? ALL_DAYS_SCHEDULE,
      );
      if (!best || s > best.streak) best = { habit: h, streak: s };
    }
    return best;
  }, [habits, allDates, today]);

  const avgCompletion = useMemo(() => {
    if (habits.length === 0) return 0;
    let totalMarked = 0;
    let totalScheduled = 0;
    const today = new Date();
    for (const h of habits) {
      const dates = allDates[h.id] ?? [];
      const set = new Set(dates);
      for (let i = 0; i < 30; i++) {
        const d = addDays(today, -i);
        totalScheduled += 1;
        if (set.has(toDateKey(d))) totalMarked += 1;
      }
    }
    if (totalScheduled === 0) return 0;
    return Math.round((totalMarked / totalScheduled) * 100);
  }, [habits, allDates]);

  const longestRecord = useMemo(() => {
    let rec = 0;
    for (const h of habits) {
      const dates = allDates[h.id] ?? [];
      const l = calculateLongestStreak(dates, h.schedule ?? ALL_DAYS_SCHEDULE);
      if (l > rec) rec = l;
    }
    return rec;
  }, [habits, allDates]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-ink-mute">
          Últimas 20 semanas
        </div>
        <div className="mt-1 font-display text-[26px] font-bold leading-none tracking-tightest text-ink md:text-[32px]">
          Análise
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Melhor sequência"
          value={bestHabit ? `${bestHabit.streak}` : "0"}
          sub={bestHabit?.habit.name ?? "—"}
          accent
          icon="flame"
        />
        <SummaryCard
          label="Conclusão média"
          value={`${avgCompletion}%`}
          sub="últimos 30 dias"
          icon="chart"
        />
        <SummaryCard
          label="Total registrado"
          value={totalCompletions.toString()}
          sub="conclusões"
          icon="check"
        />
        <SummaryCard
          label="Recorde pessoal"
          value={`${longestRecord}d`}
          sub="maior streak"
          icon="trophy"
        />
      </div>

      {/* Insights grid */}
      {insights.length > 0 && (
        <div>
          <div className="mb-3 font-display text-[17px] font-semibold text-ink tracking-tighter">
            Insights automáticos
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((ins) => (
              <InsightCard key={ins.id} insight={ins} />
            ))}
          </div>
        </div>
      )}

      {habits.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 p-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-lg bg-accent-soft ring-1 ring-accent-ring">
            <HIcon
              name="chart"
              size={24}
              color="rgb(var(--accent))"
              strokeWidth={2}
            />
          </div>
          <h3 className="mt-4 font-display text-[17px] font-semibold tracking-tighter text-ink">
            Ainda sem dados para analisar
          </h3>
          <p className="mt-1 max-w-xs text-[13px] text-ink-dim">
            Crie um hábito e marque alguns dias para ver padrões e sugestões.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  icon: "flame" | "chart" | "check" | "trophy";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        accent
          ? "border-transparent bg-accent text-[rgb(10,10,10)]"
          : "border-border bg-surface text-ink",
      )}
    >
      <HIcon
        name={icon}
        size={18}
        color={accent ? "rgb(10,10,10)" : "rgb(var(--text-dim))"}
      />
      <div className="mt-3 font-display text-[24px] font-bold leading-none tracking-tighter md:text-[26px]">
        {value}
      </div>
      <div
        className={cn(
          "mt-1.5 font-mono text-[10px] uppercase tracking-wider",
          accent ? "opacity-75" : "text-ink-mute",
        )}
      >
        {label} · {sub}
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: AggregatedInsight }) {
  const tone = insight.tone;
  const palette =
    tone === "positive"
      ? {
          bg: "rgba(163,230,53,0.08)",
          border: "rgba(163,230,53,0.22)",
          icon: "#a3e635",
        }
      : tone === "warning"
        ? {
            bg: "rgba(255,180,84,0.06)",
            border: "rgba(255,180,84,0.2)",
            icon: "#ffb454",
          }
        : {
            bg: "rgb(var(--accent-soft))",
            border: "rgba(232,255,58,0.22)",
            icon: "rgb(var(--accent))",
          };

  // Parse **bold** segments
  const parts = insight.text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <div
      className="flex items-start gap-3 rounded-lg border p-4"
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border"
        style={{
          background: "rgb(var(--bg))",
          borderColor: palette.border,
          color: palette.icon,
        }}
      >
        <HIcon
          name={
            tone === "positive" ? "flame" : tone === "warning" ? "bell" : "sparkles"
          }
          size={15}
        />
      </div>
      <div className="min-w-0 flex-1 text-[13px] leading-[1.45] text-ink-dim">
        {parts.map((p, i) => {
          if (p.startsWith("**") && p.endsWith("**")) {
            return (
              <strong key={i} className="font-semibold text-ink">
                {p.slice(2, -2)}
              </strong>
            );
          }
          return <span key={i}>{p}</span>;
        })}
      </div>
    </div>
  );
}

// silence IconTile lint if not used
void IconTile;
