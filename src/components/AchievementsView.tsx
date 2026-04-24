import { useEffect, useMemo, useState } from "react";
import type { Habit } from "@/db/schema";
import type { DbBundle } from "@/db/client";
import { HIcon, type IconName } from "./icons/HIcon";
import { ProgressRing } from "./ProgressRing";
import { calculateLongestStreak, calculateCurrentStreak } from "@/lib/streak";
import { ALL_DAYS_SCHEDULE } from "@/lib/schedule";
import { todayKey, type DateKey } from "@/lib/date";
import { cn } from "@/lib/utils";

interface Props {
  bundle: DbBundle | null;
  habits: Habit[];
}

type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
type Group = "streak" | "total" | "quality";

interface Achievement {
  id: string;
  group: Group;
  icon: IconName;
  name: string;
  desc: string;
  threshold?: number;
  rarity: Rarity;
}

const ACHIEVEMENTS: Achievement[] = [
  // streak
  { id: "streak-3", group: "streak", icon: "sparkles", name: "Primeiros passos", desc: "3 dias consecutivos", threshold: 3, rarity: "common" },
  { id: "streak-7", group: "streak", icon: "flame", name: "Semana firme", desc: "7 dias consecutivos em qualquer hábito", threshold: 7, rarity: "common" },
  { id: "streak-14", group: "streak", icon: "flame", name: "Duas semanas", desc: "14 dias consecutivos", threshold: 14, rarity: "common" },
  { id: "streak-30", group: "streak", icon: "flame", name: "Mensalista", desc: "30 dias sem quebrar", threshold: 30, rarity: "uncommon" },
  { id: "streak-60", group: "streak", icon: "flame", name: "Dois meses", desc: "60 dias de disciplina", threshold: 60, rarity: "rare" },
  { id: "streak-100", group: "streak", icon: "trophy", name: "Centurião", desc: "100 dias — raro e valioso", threshold: 100, rarity: "epic" },
  { id: "streak-365", group: "streak", icon: "trophy", name: "Um ano inteiro", desc: "365 dias transformam quem você é", threshold: 365, rarity: "legendary" },

  // volume
  { id: "total-25", group: "total", icon: "check-circle", name: "Primeiros 25", desc: "25 hábitos concluídos no total", threshold: 25, rarity: "common" },
  { id: "total-100", group: "total", icon: "check-circle", name: "Quarteto perfeito", desc: "100 conclusões no total", threshold: 100, rarity: "uncommon" },
  { id: "total-500", group: "total", icon: "trophy", name: "Quinhentos marcados", desc: "500 hábitos concluídos", threshold: 500, rarity: "rare" },
  { id: "total-1000", group: "total", icon: "trophy", name: "Mil conclusões", desc: "1.000 hábitos marcados", threshold: 1000, rarity: "epic" },

  // quality
  { id: "perfect-week", group: "quality", icon: "check", name: "Semana perfeita", desc: "Todos os hábitos feitos 7 dias seguidos", rarity: "uncommon" },
  { id: "diverse", group: "quality", icon: "book", name: "Polivalente", desc: "Pelo menos 3 hábitos ativos simultaneamente", rarity: "common" },
  { id: "early-adopter", group: "quality", icon: "home", name: "Pioneiro", desc: "Criou o primeiro hábito", rarity: "common" },
];

const RARITY_COLORS: Record<
  Rarity,
  { bg: string; border: string; text: string; glow: string; icon: string }
> = {
  common: {
    bg: "rgb(var(--surface))",
    border: "rgb(var(--border))",
    text: "rgb(var(--text-dim))",
    glow: "none",
    icon: "rgb(var(--text))",
  },
  uncommon: {
    bg: "rgba(163, 230, 53, 0.06)",
    border: "rgba(163, 230, 53, 0.25)",
    text: "rgb(163 230 53)",
    glow: "none",
    icon: "rgb(163 230 53)",
  },
  rare: {
    bg: "rgba(125, 211, 252, 0.06)",
    border: "rgba(125, 211, 252, 0.3)",
    text: "rgb(125 211 252)",
    glow: "0 0 30px rgba(125, 211, 252, 0.15)",
    icon: "rgb(125 211 252)",
  },
  epic: {
    bg: "rgba(232, 121, 249, 0.06)",
    border: "rgba(232, 121, 249, 0.3)",
    text: "rgb(232 121 249)",
    glow: "0 0 30px rgba(232, 121, 249, 0.2)",
    icon: "rgb(232 121 249)",
  },
  legendary: {
    bg: "rgba(232, 255, 58, 0.08)",
    border: "rgba(232, 255, 58, 0.35)",
    text: "rgb(var(--accent))",
    glow: "0 0 40px rgba(232, 255, 58, 0.25)",
    icon: "rgb(var(--accent))",
  },
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
};

const GROUP_LABEL: Record<Group, string> = {
  streak: "Sequências",
  total: "Volume",
  quality: "Qualidade",
};

type Filter = "all" | "unlocked" | "locked";

export function AchievementsView({ bundle, habits }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [allDates, setAllDates] = useState<{ [id: string]: DateKey[] }>({});

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

  const maxStreak = useMemo(() => {
    const today = todayKey();
    let max = 0;
    for (const h of habits) {
      const dates = allDates[h.id] ?? [];
      const cur = calculateCurrentStreak(
        dates,
        today,
        h.schedule ?? ALL_DAYS_SCHEDULE,
      );
      const rec = calculateLongestStreak(dates, h.schedule ?? ALL_DAYS_SCHEDULE);
      if (cur > max) max = cur;
      if (rec > max) max = rec;
    }
    return max;
  }, [habits, allDates]);

  const activeHabitsCount = habits.filter(
    (h) => !h.archivedAt && !h.pausedAt,
  ).length;

  const evaluated = useMemo(
    () =>
      ACHIEVEMENTS.map((a) => {
        let unlocked = false;
        let progress = 0;
        if (a.group === "streak" && a.threshold !== undefined) {
          unlocked = maxStreak >= a.threshold;
          progress = Math.min(1, maxStreak / a.threshold);
        } else if (a.group === "total" && a.threshold !== undefined) {
          unlocked = totalCompletions >= a.threshold;
          progress = Math.min(1, totalCompletions / a.threshold);
        } else if (a.id === "diverse") {
          unlocked = activeHabitsCount >= 3;
          progress = Math.min(1, activeHabitsCount / 3);
        } else if (a.id === "early-adopter") {
          unlocked = habits.length > 0;
          progress = habits.length > 0 ? 1 : 0;
        } else if (a.id === "perfect-week") {
          // Simplified check: any habit with current streak >= 7
          unlocked = maxStreak >= 7;
          progress = Math.min(1, maxStreak / 7);
        }
        return { ...a, unlocked, progress };
      }),
    [habits.length, maxStreak, totalCompletions, activeHabitsCount],
  );

  const unlockedCount = evaluated.filter((a) => a.unlocked).length;
  const total = evaluated.length;
  const nextUnlock = evaluated
    .filter((a) => !a.unlocked)
    .sort((a, b) => b.progress - a.progress)[0];

  const filtered = evaluated.filter((a) => {
    if (filter === "unlocked") return a.unlocked;
    if (filter === "locked") return !a.unlocked;
    return true;
  });

  const grouped =
    filter === "all"
      ? {
          streak: filtered.filter((a) => a.group === "streak"),
          total: filtered.filter((a) => a.group === "total"),
          quality: filtered.filter((a) => a.group === "quality"),
        }
      : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
          Seu histórico
        </div>
        <div className="mt-1 font-display text-[26px] font-bold leading-none tracking-tightest text-ink md:text-[32px]">
          Conquistas
        </div>
      </div>

      {/* Progress summary */}
      <div className="grid grid-cols-1 gap-5 rounded-xl border border-border bg-surface p-5 md:grid-cols-[auto_1fr_auto] md:items-center md:p-6">
        <ProgressRing
          value={total === 0 ? 0 : unlockedCount / total}
          size={96}
          stroke={7}
        >
          <div className="text-center leading-none">
            <div className="font-display text-[22px] font-bold text-ink tracking-tighter">
              {unlockedCount}
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-ink-mute">
              DE {total}
            </div>
          </div>
        </ProgressRing>

        <div>
          <div className="font-display text-[20px] font-bold text-ink leading-tight tracking-tighter md:text-[22px]">
            {unlockedCount === total
              ? "Todas conquistadas 🎉"
              : `${total - unlockedCount} para desbloquear`}
          </div>
          {nextUnlock && (
            <div className="mt-2 text-[13px] leading-[1.45] text-ink-dim">
              Próxima:{" "}
              <span className="font-semibold text-ink">
                {nextUnlock.name}
              </span>{" "}
              — {Math.round(nextUnlock.progress * 100)}% lá.
            </div>
          )}
        </div>

        {/* Rarity stats — hidden on mobile */}
        <div className="hidden gap-4 border-l border-border pl-5 md:flex">
          {(["legendary", "epic", "rare", "uncommon", "common"] as Rarity[]).map(
            (r) => {
              const count = evaluated.filter(
                (a) => a.rarity === r && a.unlocked,
              ).length;
              const totalR = evaluated.filter((a) => a.rarity === r).length;
              const c = RARITY_COLORS[r];
              return (
                <div key={r} className="text-center">
                  <div
                    className="font-display text-[20px] font-bold tracking-tighter leading-none"
                    style={{ color: c.icon }}
                  >
                    {count}
                    <span className="ml-0.5 text-[12px] font-medium text-ink-mute">
                      /{totalR}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-ink-mute">
                    {RARITY_LABEL[r]}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: "all", label: `Todas · ${total}` },
            { id: "unlocked", label: `Desbloqueadas · ${unlockedCount}` },
            { id: "locked", label: `Pendentes · ${total - unlockedCount}` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={cn(
              "h-8 rounded-pill border px-3.5 text-[12.5px] font-semibold transition-colors",
              filter === t.id
                ? "border-border-strong bg-surface-3 text-ink"
                : "border-border bg-transparent text-ink-dim hover:bg-surface-2 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {grouped ? (
        (Object.keys(grouped) as Group[]).map((g) => {
          const items = grouped[g];
          if (items.length === 0) return null;
          const done = items.filter((i) => i.unlocked).length;
          return (
            <div key={g}>
              <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-mute">
                {GROUP_LABEL[g]}
                <div className="h-px flex-1 bg-border" />
                <span>
                  {done} / {items.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
                {items.map((a) => (
                  <AchievementCard key={a.id} achievement={a} />
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
          {filtered.map((a) => (
            <AchievementCard key={a.id} achievement={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AchievementCard({
  achievement,
}: {
  achievement: Achievement & { unlocked: boolean; progress: number };
}) {
  const c = RARITY_COLORS[achievement.rarity];
  const isLegendary = achievement.rarity === "legendary";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border p-4 transition-all",
        achievement.unlocked ? "opacity-100" : "opacity-60",
      )}
      style={{
        background: achievement.unlocked ? c.bg : "rgb(var(--surface))",
        borderColor: achievement.unlocked ? c.border : "rgb(var(--border))",
        boxShadow: achievement.unlocked ? c.glow : "none",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-md border",
            isLegendary && achievement.unlocked
              ? "bg-accent text-[rgb(10,10,10)]"
              : "bg-transparent",
          )}
          style={{
            borderColor: achievement.unlocked ? c.border : "rgb(var(--border))",
            color: isLegendary && achievement.unlocked ? "rgb(10,10,10)" : c.icon,
          }}
        >
          {achievement.unlocked ? (
            <HIcon name={achievement.icon} size={22} strokeWidth={2} />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "rgb(var(--text-mute))" }}
            >
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          )}
        </div>
        <div
          className="shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide"
          style={{
            background: achievement.unlocked
              ? "rgba(0,0,0,0.2)"
              : "rgb(var(--surface-2))",
            borderColor: achievement.unlocked ? c.border : "rgb(var(--border))",
            color: achievement.unlocked ? c.text : "rgb(var(--text-mute))",
          }}
        >
          {RARITY_LABEL[achievement.rarity]}
        </div>
      </div>

      <div
        className={cn(
          "mt-3.5 font-display text-[15px] font-bold leading-tight tracking-tighter",
          achievement.unlocked ? "text-ink" : "text-ink-dim",
        )}
      >
        {achievement.name}
      </div>
      <div className="mt-1 text-[12px] leading-[1.4] text-ink-dim">
        {achievement.desc}
      </div>

      {!achievement.unlocked && achievement.progress > 0 && (
        <div className="mt-3.5">
          <div className="h-1 overflow-hidden rounded-pill bg-surface-3">
            <div
              className="h-full rounded-pill"
              style={{
                width: `${Math.min(100, achievement.progress * 100)}%`,
                background: c.icon,
              }}
            />
          </div>
          <div className="mt-1.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-ink-mute">
            {Math.round(achievement.progress * 100)}% concluído
          </div>
        </div>
      )}

      {achievement.unlocked && (
        <div
          className="mt-3.5 flex items-center gap-1.5 border-t pt-3 font-mono text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: c.text, borderColor: c.border }}
        >
          <HIcon name="check" size={11} strokeWidth={2.5} />
          Conquistado
        </div>
      )}
    </div>
  );
}
