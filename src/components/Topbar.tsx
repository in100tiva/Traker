import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { HIcon } from "./icons/HIcon";
import { useUIStore, type ActiveView } from "@/store/useUIStore";

const TAB_TITLES: Record<ActiveView, string> = {
  today: "Hoje",
  habits: "Hábitos",
  stats: "Análise",
  calendar: "Calendário",
  achievements: "Conquistas",
};

interface Props {
  onOpenCreate: () => void;
  /** Tablet only: shows hamburger to open a pop-out sidebar. */
  showSidebarToggle?: boolean;
  onToggleSidebar?: () => void;
  /** Right-side action slot (reminders, export-import, shortcuts). */
  actions?: ReactNode;
  /** Hide the "Novo hábito" button (used on mobile where it's in the pill nav) */
  hideCreate?: boolean;
}

export function Topbar({
  onOpenCreate,
  showSidebarToggle,
  onToggleSidebar,
  actions,
  hideCreate = false,
}: Props) {
  const { activeView } = useUIStore();

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-bg px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showSidebarToggle && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Abrir menu"
          >
            <HIcon name="menu" size={18} />
          </button>
        )}
        <div className="truncate font-display text-[15px] font-semibold capitalize text-ink">
          {TAB_TITLES[activeView]}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        {actions}
        {!hideCreate && (
          <Button variant="primary" size="sm" onClick={onOpenCreate}>
            <HIcon name="plus" size={14} strokeWidth={2} />
            <span className="hidden sm:inline">Novo hábito</span>
          </Button>
        )}
      </div>
    </header>
  );
}
