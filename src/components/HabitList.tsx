import { Archive, GripVertical, Home, Pause, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Habit } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

interface Props {
  habits: Habit[];
  loading: boolean;
  onReorder: (orderedIds: string[]) => void;
}

export function HabitList({ habits, loading, onReorder }: Props) {
  const {
    activeView,
    selectedHabitId,
    setSelectedHabit,
    openCreate,
    showArchived,
    toggleShowArchived,
    setView,
  } = useUIStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = habits.findIndex((h) => h.id === active.id);
    const newIndex = habits.findIndex((h) => h.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(habits, oldIndex, newIndex);
    onReorder(reordered.map((h) => h.id));
  }

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
      {!showArchived && (
        <button
          type="button"
          onClick={() => setView("today")}
          className={cn(
            "flex items-center gap-2 border-b px-4 py-3 text-left text-sm transition-colors hover:bg-accent",
            activeView === "today" && "bg-accent",
          )}
        >
          <Home className="h-4 w-4" />
          <span className="flex-1">Hoje</span>
        </button>
      )}
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
        {!showArchived && habits.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={habits.map((h) => h.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul>
                {habits.map((h) => (
                  <SortableRow
                    key={h.id}
                    habit={h}
                    active={
                      h.id === selectedHabitId && activeView === "habit"
                    }
                    onClick={() => {
                      setSelectedHabit(h.id);
                      setView("habit");
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <ul>
            {habits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHabit(h.id);
                    setView("habit");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-accent",
                    h.id === selectedHabitId &&
                      activeView === "habit" &&
                      "bg-accent",
                    h.archivedAt && "opacity-60",
                  )}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: h.color }}
                  />
                  <span className="flex-1 truncate">{h.name}</span>
                  {h.pausedAt && <Pause className="h-3 w-3 text-muted-foreground" />}
                  {h.archivedAt && (
                    <Archive className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
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

interface SortableRowProps {
  habit: Habit;
  active: boolean;
  onClick: () => void;
}

function SortableRow({ habit, active, onClick }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: habit.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  } as React.CSSProperties;
  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={cn(
          "group flex items-center gap-1 transition-colors hover:bg-accent",
          active && "bg-accent",
          habit.pausedAt && "opacity-60",
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex items-center px-1 py-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClick}
          className="flex flex-1 items-center gap-2 py-3 pr-4 text-left text-sm"
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: habit.color }}
          />
          <span className="flex-1 truncate">{habit.name}</span>
          {habit.pausedAt && <Pause className="h-3 w-3 text-muted-foreground" />}
        </button>
      </div>
    </li>
  );
}
