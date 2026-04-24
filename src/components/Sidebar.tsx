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
import { HIcon, type IconName } from "./icons/HIcon";
import { LogoWordmark } from "./Logo";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

interface Props {
  habits: Habit[];
  loading: boolean;
  onReorder: (orderedIds: string[]) => void;
  /** Max longest streak across all habits (for the side card). */
  recordStreak: number;
  /** Current streak of the most-on-fire habit. */
  currentStreak: number;
}

interface NavItem {
  id: "today" | "archived";
  icon: IconName;
  label: string;
}

export function Sidebar({
  habits,
  loading,
  onReorder,
  recordStreak,
  currentStreak,
}: Props) {
  const {
    activeView,
    selectedHabitId,
    setSelectedHabit,
    openCreate,
    showArchived,
    toggleShowArchived,
    setView,
    setSidebarOpen,
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

  function selectHabit(id: string) {
    setSelectedHabit(id);
    setView("habit");
    setSidebarOpen(false);
  }

  const navItems: NavItem[] = [
    { id: "today", icon: "home", label: "Hoje" },
    { id: "archived", icon: "archive", label: "Arquivados" },
  ];

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface-1">
      {/* Brand */}
      <div className="flex items-center justify-between border-b border-border px-4 pt-6 pb-5">
        <LogoWordmark size="sm" />
      </div>

      {/* Main nav */}
      <div className="flex flex-col gap-0.5 px-3 pt-4">
        {navItems.map((it) => {
          const isActive =
            (it.id === "today" && !showArchived) ||
            (it.id === "archived" && showArchived);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => {
                if (it.id === "archived" && !showArchived) toggleShowArchived();
                else if (it.id === "today" && showArchived) toggleShowArchived();
                else if (it.id === "today") setView("today");
                setSidebarOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-[13.5px] transition-colors",
                isActive
                  ? "bg-surface-3 text-ink font-semibold"
                  : "text-ink-dim hover:bg-surface-2 hover:text-ink font-medium",
              )}
            >
              <HIcon name={it.icon} size={17} />
              {it.label}
              {isActive && (
                <span className="ml-auto h-[5px] w-[5px] rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>

      {/* Habits list header */}
      <div className="mt-5 flex items-center justify-between px-5 pb-2">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
          {showArchived ? "Arquivados" : "Hábitos"}
        </div>
        {!showArchived && (
          <button
            type="button"
            onClick={openCreate}
            aria-label="Novo hábito"
            className="grid h-6 w-6 place-items-center rounded-sm text-ink-mute transition-colors hover:bg-surface-2 hover:text-accent"
          >
            <HIcon name="plus" size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading && (
          <div className="px-4 py-3 font-mono text-[10px] text-ink-mute">
            Carregando…
          </div>
        )}
        {!loading && habits.length === 0 && (
          <div className="px-4 py-3 font-mono text-[10px] text-ink-mute">
            {showArchived
              ? "Nenhum arquivado."
              : "Nenhum hábito ainda."}
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
              <ul className="flex flex-col gap-0.5">
                {habits.map((h) => (
                  <SortableRow
                    key={h.id}
                    habit={h}
                    active={
                      h.id === selectedHabitId && activeView === "habit"
                    }
                    onClick={() => selectHabit(h.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {habits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => selectHabit(h.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-[13px] transition-colors",
                    h.id === selectedHabitId && activeView === "habit"
                      ? "bg-surface-3 text-ink font-medium"
                      : "text-ink-dim hover:bg-surface-2 hover:text-ink",
                    h.archivedAt && "opacity-60",
                  )}
                >
                  <HabitDot habit={h} />
                  <span className="flex-1 truncate">{h.name}</span>
                  {h.pausedAt && (
                    <HIcon name="pause" size={12} color="currentColor" />
                  )}
                  {h.archivedAt && (
                    <HIcon name="archive" size={12} color="currentColor" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Streak card */}
      <div className="mx-3 mt-2 rounded-md border border-border bg-bg p-3.5">
        <div className="flex items-center gap-2 text-accent">
          <HIcon name="flame" size={15} />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
            Sequência atual
          </span>
        </div>
        <div className="mt-2 font-display text-[28px] font-bold text-ink tracking-tighter leading-none">
          {currentStreak}{" "}
          <span className="text-[13px] font-medium text-ink-dim">dias</span>
        </div>
        <div className="mt-1 font-mono text-[10.5px] text-ink-dim">
          Recorde pessoal: {recordStreak}d
        </div>
      </div>

      {/* User card */}
      <div className="m-3 mt-2.5 flex items-center gap-2.5 rounded-sm bg-surface-2 p-2 pr-2.5">
        <div
          className="grid h-8 w-8 place-items-center rounded-full text-[rgb(10,10,10)] font-bold text-xs"
          style={{
            background:
              "linear-gradient(135deg, rgb(232, 255, 58), oklch(0.7 0.15 80))",
          }}
        >
          LP
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink">Você</div>
          <div className="font-mono text-[10px] text-ink-mute">Plano local</div>
        </div>
        <HIcon name="settings" size={14} color="rgb(var(--text-mute))" />
      </div>
    </aside>
  );
}

function HabitDot({ habit }: { habit: Habit }) {
  if (habit.emoji) {
    return <span className="text-[15px] leading-none">{habit.emoji}</span>;
  }
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: habit.color }}
    />
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
          "group relative flex items-center gap-1 rounded-sm transition-colors",
          active
            ? "bg-surface-3"
            : "hover:bg-surface-2",
          habit.pausedAt && "opacity-60",
        )}
      >
        {active && (
          <div className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-accent" />
        )}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex items-center px-1 py-2 text-ink-mute opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Arrastar para reordenar"
        >
          <HIcon name="grip" size={14} />
        </button>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "flex flex-1 items-center gap-2.5 py-2 pr-3 text-left text-[13px]",
            active ? "text-ink font-medium" : "text-ink-dim hover:text-ink",
          )}
        >
          <HabitDot habit={habit} />
          <span className="flex-1 truncate">{habit.name}</span>
          {habit.pausedAt && (
            <HIcon name="pause" size={12} color="currentColor" />
          )}
        </button>
      </div>
    </li>
  );
}
