import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { HIcon } from "./icons/HIcon";
import { useUIStore } from "@/store/useUIStore";

interface Props {
  onOpenCommand: () => void;
  onOpenCreate: () => void;
  onToggleSidebar: () => void;
  breadcrumbParent?: string;
}

export function Topbar({
  onOpenCommand,
  onOpenCreate,
  onToggleSidebar,
  breadcrumbParent = "Painel",
}: Props) {
  const { showArchived } = useUIStore();
  const dateLabel = format(new Date(), "'Hoje' · dd MMM yyyy", { locale: ptBR });

  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between gap-3 border-b border-border bg-bg px-4 md:px-7">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="grid h-9 w-9 place-items-center rounded-sm text-ink-dim hover:bg-surface-2 hover:text-ink md:hidden"
          aria-label="Abrir menu"
        >
          <HIcon name="menu" size={18} />
        </button>
        <div className="text-[14px] font-semibold text-ink">
          {showArchived ? "Arquivados" : breadcrumbParent}
        </div>
        <HIcon name="chevron-right" size={14} color="rgb(var(--text-mute))" />
        <div className="hidden truncate text-[14px] text-ink-dim md:block">
          {dateLabel}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenCommand}
          className="hidden h-9 items-center gap-2 rounded-pill border border-border bg-surface px-3.5 text-[13px] text-ink-mute transition-colors hover:border-border-strong hover:text-ink-dim md:flex md:w-[280px]"
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
          className="grid h-9 w-9 place-items-center rounded-sm text-ink-dim hover:bg-surface-2 hover:text-ink md:hidden"
        >
          <HIcon name="search" size={16} />
        </button>
        <Button variant="primary" size="sm" onClick={onOpenCreate}>
          <HIcon name="plus" size={14} strokeWidth={2} />
          Novo hábito
        </Button>
      </div>
    </header>
  );
}
