import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { HIcon } from "./icons/HIcon";
import { useUIStore } from "@/store/useUIStore";

interface Props {
  onOpenCommand: () => void;
  onOpenCreate: () => void;
  onToggleSidebar: () => void;
  breadcrumbParent?: string;
  /** Right-side action slot (Reminders, ExportImport, ShortcutsHelpButton…) */
  actions?: ReactNode;
}

export function Topbar({
  onOpenCommand,
  onOpenCreate,
  onToggleSidebar,
  breadcrumbParent = "Painel",
  actions,
}: Props) {
  const { showArchived } = useUIStore();
  const dateLabel = format(new Date(), "'Hoje' · dd MMM yyyy", { locale: ptBR });

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-bg px-3 md:px-6">
      {/* Left cluster — shrinkable */}
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-ink-dim hover:bg-surface-2 hover:text-ink md:hidden"
          aria-label="Abrir menu"
        >
          <HIcon name="menu" size={18} />
        </button>
        <div className="truncate text-[14px] font-semibold text-ink">
          {showArchived ? "Arquivados" : breadcrumbParent}
        </div>
        <HIcon
          name="chevron-right"
          size={14}
          color="rgb(var(--text-mute))"
          className="shrink-0 hidden sm:block"
        />
        <div className="hidden truncate text-[14px] text-ink-dim sm:block">
          {dateLabel}
        </div>
      </div>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        {/* Search: pill in >=lg, icon-only below */}
        <button
          type="button"
          onClick={onOpenCommand}
          className="hidden h-9 items-center gap-2 rounded-pill border border-border bg-surface px-3.5 text-[13px] text-ink-mute transition-colors hover:border-border-strong hover:text-ink-dim lg:flex lg:w-[260px] xl:w-[280px]"
        >
          <HIcon name="search" size={14} />
          <span className="flex-1 text-left">Buscar hábitos…</span>
          <span className="rounded-sm bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-ink-dim">
            ⌘K
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenCommand}
          aria-label="Buscar"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-ink-dim hover:bg-surface-2 hover:text-ink lg:hidden"
        >
          <HIcon name="search" size={16} />
        </button>

        {/* Optional side actions (reminders, export, shortcuts) */}
        {actions && (
          <div className="flex items-center gap-1">{actions}</div>
        )}

        <Button variant="primary" size="sm" onClick={onOpenCreate}>
          <HIcon name="plus" size={14} strokeWidth={2} />
          <span className="hidden sm:inline">Novo hábito</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>
    </header>
  );
}
