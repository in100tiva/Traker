import { useMemo, useState } from "react";
import type { Habit } from "@/db/schema";
import type { DbBundle } from "@/db/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { HIcon } from "./icons/HIcon";
import { IconTile } from "./IconTile";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Props {
  bundle: DbBundle | null;
  habits: Habit[];
  onOpenCreate: () => void;
  onEdit: (h: Habit) => void;
  onArchive: (id: string, name: string) => Promise<void> | void;
  onUnarchive: (id: string) => Promise<void> | void;
  onPause: (id: string) => Promise<void> | void;
  onResume: (id: string) => Promise<void> | void;
  onDelete: (id: string, name: string) => Promise<void> | void;
  onSelect: (id: string) => void;
}

type Group = "all" | "category" | "status";

export function HabitsManagementView({
  habits,
  onOpenCreate,
  onEdit,
  onArchive,
  onUnarchive,
  onPause,
  onResume,
  onDelete,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group>("all");
  const [sheet, setSheet] = useState<Habit | null>(null);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return habits;
    return habits.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.tag ?? "").toLowerCase().includes(q),
    );
  }, [habits, query]);

  const active = filtered.filter((h) => !h.archivedAt && !h.pausedAt);
  const archived = filtered.filter((h) => h.archivedAt);
  const paused = filtered.filter((h) => h.pausedAt && !h.archivedAt);

  // Simple at-risk heuristic. We don't have live completion counts here,
  // so we flag habits with target_per_week > 0 but no recent streak info.
  // Zero for now — can be enriched when we compute per-habit streaks.
  const activeAtRisk = 0;

  const renderGrouped = (list: Habit[]) => {
    if (group === "category") {
      const groups = new Map<string, Habit[]>();
      for (const h of list) {
        const key = h.tag ?? "_sem_tag";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(h);
      }
      return Array.from(groups.entries())
        .sort(([a], [b]) => {
          if (a === "_sem_tag") return 1;
          if (b === "_sem_tag") return -1;
          return a.localeCompare(b);
        })
        .map(([key, items]) => (
          <div key={key} className="mb-5">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
                {key === "_sem_tag" ? "Sem tag" : key}
              </span>
              <span className="font-mono text-[10px] text-ink-mute">
                {items.length}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {items.map((h) => (
                <HabitManageRow
                  key={h.id}
                  habit={h}
                  onTap={() => setSheet(h)}
                />
              ))}
            </ul>
          </div>
        ));
    }
    return (
      <ul className="flex flex-col gap-2">
        {list.map((h) => (
          <HabitManageRow key={h.id} habit={h} onTap={() => setSheet(h)} />
        ))}
      </ul>
    );
  };

  async function handleAction(action: string) {
    if (!sheet) return;
    const h = sheet;
    setSheet(null);
    switch (action) {
      case "edit":
        onEdit(h);
        break;
      case "pause":
        if (h.pausedAt) await onResume(h.id);
        else await onPause(h.id);
        break;
      case "archive":
        if (h.archivedAt) await onUnarchive(h.id);
        else await onArchive(h.id, h.name);
        break;
      case "open":
        onSelect(h.id);
        break;
      case "delete":
        if (window.confirm(`Excluir permanentemente "${h.name}"?`))
          await onDelete(h.id, h.name);
        break;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
            Gerenciar
          </div>
          <div className="mt-1 font-display text-[26px] font-bold leading-none tracking-tightest text-ink md:text-[28px]">
            Hábitos{" "}
            <span className="font-mono text-[16px] font-medium text-ink-dim">
              {habits.length}
            </span>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={onOpenCreate}>
          <HIcon name="plus" size={14} strokeWidth={2} />
          Novo hábito
        </Button>
      </div>

      {/* Search */}
      <div className="flex h-11 items-center gap-2.5 rounded-pill border border-border bg-surface-2 px-4">
        <HIcon name="search" size={15} color="rgb(var(--text-mute))" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar hábitos ou categoria…"
          className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink-mute focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="text-ink-mute hover:text-ink"
          >
            <HIcon name="x" size={14} />
          </button>
        )}
      </div>

      {/* Group tabs */}
      <div className="flex gap-1 rounded-pill border border-border bg-surface-2 p-1">
        {(["all", "category", "status"] as Group[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={cn(
              "flex-1 rounded-pill px-3 py-2 text-[12.5px] font-semibold transition-colors",
              group === g
                ? "bg-surface-3 text-ink"
                : "bg-transparent text-ink-dim hover:text-ink",
            )}
          >
            {g === "all" ? "Todos" : g === "category" ? "Categoria" : "Status"}
          </button>
        ))}
      </div>

      {/* Stats pills */}
      <div className="grid grid-cols-3 gap-2">
        <StatPill label="Ativos" value={active.length} />
        <StatPill
          label="Em risco"
          value={activeAtRisk}
          tone={activeAtRisk > 0 ? "warning" : "neutral"}
        />
        <StatPill
          label="Pausados"
          value={paused.length + archived.length}
          tone="muted"
        />
      </div>

      {/* Active list */}
      {group === "status" ? (
        <>
          <Section title={`Ativos · ${active.length}`}>
            {renderGrouped(active)}
          </Section>
          {paused.length > 0 && (
            <Section title={`Pausados · ${paused.length}`}>
              <ul className="flex flex-col gap-2">
                {paused.map((h) => (
                  <HabitManageRow
                    key={h.id}
                    habit={h}
                    onTap={() => setSheet(h)}
                  />
                ))}
              </ul>
            </Section>
          )}
          {archived.length > 0 && (
            <Section title={`Arquivados · ${archived.length}`}>
              <ul className="flex flex-col gap-2">
                {archived.map((h) => (
                  <HabitManageRow
                    key={h.id}
                    habit={h}
                    onTap={() => setSheet(h)}
                  />
                ))}
              </ul>
            </Section>
          )}
        </>
      ) : (
        <>
          {group !== "category" && (
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
              Ativos · {active.length}
            </div>
          )}
          {renderGrouped(active)}
          {archived.length > 0 && (
            <Section title={`Arquivados · ${archived.length}`}>
              <ul className="flex flex-col gap-2">
                {archived.map((h) => (
                  <HabitManageRow
                    key={h.id}
                    habit={h}
                    onTap={() => setSheet(h)}
                  />
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 p-8 text-center font-mono text-[12px] text-ink-mute">
          Nenhum hábito encontrado
          {query ? ` para "${query}"` : ""}.
        </div>
      )}

      <HabitActionSheet
        habit={sheet}
        isMobile={isMobile}
        onClose={() => setSheet(null)}
        onAction={handleAction}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-mute">
        {title}
      </div>
      {children}
    </div>
  );
}

function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warning" | "muted";
}) {
  const valueColor =
    tone === "warning"
      ? "text-[#ffb454]"
      : tone === "muted"
        ? "text-ink-dim"
        : "text-ink";
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="font-mono text-[9px] uppercase tracking-wide text-ink-mute">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-[20px] font-bold tracking-tighter leading-none",
          valueColor,
        )}
      >
        {value}
      </div>
    </div>
  );
}

function HabitManageRow({
  habit,
  onTap,
}: {
  habit: Habit;
  onTap: () => void;
}) {
  const paused = Boolean(habit.pausedAt);
  const archived = Boolean(habit.archivedAt);
  return (
    <li>
      <button
        type="button"
        onClick={onTap}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong",
          (paused || archived) && "opacity-60",
        )}
      >
        <IconTile
          emoji={habit.emoji}
          iconName={habit.emoji ? undefined : "check"}
          size={36}
          bg={`${habit.color}26`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-display text-[14px] font-semibold text-ink tracking-tighter">
              {habit.name}
            </div>
            {paused && (
              <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-ink-mute">
                Pausado
              </span>
            )}
            {archived && (
              <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-ink-mute">
                Arquivado
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate font-mono text-[10.5px] text-ink-dim">
            {habit.tag ?? "geral"} ·{" "}
            {habit.targetPerWeek === 7
              ? "diário"
              : `${habit.targetPerWeek}×/semana`}
          </div>
        </div>
        <HIcon name="chevron-right" size={14} color="rgb(var(--text-mute))" />
      </button>
    </li>
  );
}

function HabitActionSheet({
  habit,
  isMobile,
  onClose,
  onAction,
}: {
  habit: Habit | null;
  isMobile: boolean;
  onClose: () => void;
  onAction: (id: string) => void;
}) {
  if (!habit) return null;

  const items = [
    {
      id: "open",
      icon: "home" as const,
      label: "Abrir no painel",
      desc: "Ver heatmap, stats e marcar",
    },
    {
      id: "edit",
      icon: "settings" as const,
      label: "Editar hábito",
      desc: "Nome, meta, frequência, ícone",
    },
    {
      id: "pause",
      icon: "pause" as const,
      label: habit.pausedAt ? "Retomar" : "Pausar",
      desc: habit.pausedAt
        ? "Voltar a rastrear este hábito"
        : "Parar temporariamente, sem apagar dados",
    },
    {
      id: "archive",
      icon: "archive" as const,
      label: habit.archivedAt ? "Restaurar" : "Arquivar",
      desc: habit.archivedAt
        ? "Voltar à lista principal"
        : "Mover para arquivados — dados preservados",
    },
    {
      id: "delete",
      icon: "trash" as const,
      label: "Excluir",
      desc: "Remove permanente — não pode desfazer",
      danger: true,
    },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "gap-0 p-0 border-border bg-surface",
          isMobile && "sm:rounded-t-[28px] sm:rounded-b-none",
        )}
      >
        <div className="flex items-center gap-3 border-b border-border p-4 pr-12">
          <IconTile
            emoji={habit.emoji}
            iconName={habit.emoji ? undefined : "check"}
            size={44}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[17px] font-bold tracking-tighter text-ink">
              {habit.name}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-ink-dim">
              {habit.tag ?? "geral"}
            </div>
          </div>
        </div>

        <div className="flex flex-col py-2">
          {items.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onAction(a.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2",
                a.danger && "text-danger",
              )}
            >
              <div
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border",
                  a.danger
                    ? "border-danger/30 bg-danger/10 text-danger"
                    : "border-border bg-surface-2 text-ink",
                )}
              >
                <HIcon name={a.icon} size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-semibold">{a.label}</div>
                <div className="truncate text-[12px] text-ink-dim">
                  {a.desc}
                </div>
              </div>
              <HIcon
                name="chevron-right"
                size={14}
                color="rgb(var(--text-mute))"
              />
            </button>
          ))}
        </div>

        <DialogFooter className="border-t border-border p-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
