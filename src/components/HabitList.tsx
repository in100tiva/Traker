import { Archive, Plus } from "lucide-react";
import type { Habit } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

interface Props {
  habits: Habit[];
  loading: boolean;
}

export function HabitList({ habits, loading }: Props) {
  const {
    selectedHabitId,
    setSelectedHabit,
    openCreate,
    showArchived,
    toggleShowArchived,
  } = useUIStore();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-card/50">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="text-sm font-semibold">
          {showArchived ? "Arquivados" : "Hábitos"}
        </h2>
        {!showArchived && (
          <Button size="sm" variant="ghost" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-xs text-muted-foreground">Carregando…</div>
        )}
        {!loading && habits.length === 0 && (
          <div className="p-4 text-xs text-muted-foreground">
            {showArchived
              ? "Nenhum hábito arquivado."
              : "Nenhum hábito ainda. Clique em Novo para começar."}
          </div>
        )}
        <ul>
          {habits.map((h) => {
            const active = h.id === selectedHabitId;
            return (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setSelectedHabit(h.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-accent",
                    active && "bg-accent",
                    h.archivedAt && "opacity-60",
                  )}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: h.color }}
                  />
                  <span className="flex-1 truncate">{h.name}</span>
                  {h.archivedAt && (
                    <Archive className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={toggleShowArchived}
        >
          <Archive className="h-4 w-4" />
          {showArchived ? "Ver ativos" : "Ver arquivados"}
        </Button>
      </div>
    </aside>
  );
}
