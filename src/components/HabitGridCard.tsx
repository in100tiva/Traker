import type { Habit } from "@/db/schema";
import { IconTile } from "./IconTile";
import { Heatmap, type HeatmapEntry } from "./Heatmap";
import { HIcon } from "./icons/HIcon";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface Props {
  habit: Habit;
  done: boolean;
  streakDays: number;
  completionPct: number;
  entries: HeatmapEntry[];
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}

export function HabitGridCard({
  habit,
  done,
  streakDays,
  completionPct,
  entries,
  selected,
  onSelect,
  onToggle,
}: Props) {
  // Last 12 weeks of the yearly data for the mini heatmap
  const recentEntries = entries.slice(-7 * 12);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full flex-col rounded-lg border p-[18px] text-left transition-all",
        selected
          ? "border-border-strong bg-surface-2 shadow-glow"
          : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <div className="flex items-start gap-3">
        <IconTile
          iconName={habit.emoji ? undefined : "check"}
          emoji={habit.emoji}
          size={40}
          bg={`${habit.color}26`}
        />
        <div className="flex-1 min-w-0">
          <div className="font-display text-[15px] font-semibold leading-tight text-ink tracking-tighter">
            {habit.name}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ink-dim">
            {habit.tag ?? "geral"}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            haptics.tap();
            onToggle();
          }}
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all",
            done
              ? "border-transparent bg-accent text-[rgb(10,10,10)]"
              : "border-border-strong text-ink-mute hover:text-ink",
          )}
          aria-label={done ? "Desmarcar" : "Marcar feito"}
        >
          {done && <HIcon name="check" size={14} strokeWidth={2.5} />}
        </button>
      </div>

      <div className="mt-3.5 font-mono text-[11px] text-ink-dim">
        {habit.targetPerWeek === 7
          ? `${habit.targetPerDay ? `${habit.targetPerDay} ${habit.unit ?? ""} · ` : ""}diário`
          : `${habit.targetPerWeek}×/semana${habit.targetPerDay ? ` · ${habit.targetPerDay} ${habit.unit ?? ""}` : ""}`}
      </div>

      {/* Mini heatmap */}
      <div className="mt-3">
        <Heatmap
          entries={recentEntries}
          compact
          showMonthNav={false}
          showLegend={false}
        />
      </div>

      {/* Footer */}
      <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-accent">
          <HIcon name="flame" size={13} />
          {streakDays}d
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1 w-14 overflow-hidden rounded-pill bg-surface-3">
            <div
              className="h-full rounded-pill bg-accent"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="w-7 text-right font-mono text-[10px] text-ink-dim">
            {completionPct}%
          </div>
        </div>
      </div>
    </button>
  );
}
