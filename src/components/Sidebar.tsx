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
import { HabitGlyph } from "./HabitGlyph";
import { LogoMark, LogoWordmark } from "./Logo";
import { useUIStore, type ActiveView } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

interface Props {
  habits: Habit[];
  loading: boolean;
  onReorder: (orderedIds: string[]) => void;
  recordStreak: number;
  currentStreak: number;
  /** When true, render only icons (tablet 72px) */
  collapsed?: boolean;
}

interface NavItem {
  id: ActiveView;
  icon: IconName;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "today", icon: "home", label: "Hoje" },
  { id: "habits", icon: "check", label: "Hábitos" },
  { id: "stats", icon: "chart", label: "Análise" },
  { id: "calendar", icon: "calendar", label: "Calendário" },
  { id: "achievements", icon: "trophy", label: "Conquistas" },
];

export function Sidebar({
  habits,
  loading,
  onReorder,
  recordStreak,
  currentStreak,
  collapsed = false,
}: Props) {
  const { activeView, selectedHabitId, setSelectedHabit, openCreate, setView } =
    useUIStore();

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

  function onPickHabit(id: string) {
    setSelectedHabit(id);
    setView("today");
  }

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-surface-1 transition-[width] duration-200",
        collapsed ? "w-[72px] px-2.5" : "w-60 px-4",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center border-b border-border pt-5 pb-4",
          collapsed ? "justify-center" : "justify-between px-1",
        )}
      >
        {collapsed ? <LogoMark size="md" /> : <LogoWordmark size="sm" />}
      </div>

      {/* Nav */}
      <div
        className={cn(
          "flex flex-col gap-0.5 flex-1",
          collapsed ? "pt-4" : "pt-4",
        )}
      >
        {NAV_ITEMS.map((it) => {
          const isActive = activeView === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setView(it.id)}
              title={collapsed ? it.label : undefined}
              className={cn(
                "flex w-full items-center rounded-sm transition-colors",
                collapsed
                  ? "h-11 justify-center"
                  : "gap-3 px-3 py-2.5 text-left",
                isActive
                  ? "bg-surface-3 text-ink font-semibold"
                  : "text-ink-dim hover:bg-surface-2 hover:text-ink font-medium",
                !collapsed && "text-[13.5px]",
              )}
            >
              <HIcon name={it.icon} size={17} />
              {!collapsed && (
                <>
                  {it.label}
                  {isActive && (
                    <span className="ml-auto h-[5px] w-[5px] rounded-full bg-accent" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Habits quick list — hidden when collapsed */}
      {!collapsed && (
        <>
          <div className="mt-4 flex items-center justify-between px-2 pb-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-mute">
              Hábitos
            </div>
            <button
              type="button"
              onClick={openCreate}
              aria-label="Novo hábito"
              className="grid h-6 w-6 place-items-center rounded-sm text-ink-mute transition-colors hover:bg-surface-2 hover:text-accent"
            >
              <HIcon name="plus" size={14} />
            </button>
          </div>

          <div className="flex-shrink min-h-0 max-h-40 overflow-y-auto pb-2">
            {loading && (
              <div className="px-3 py-2 font-mono text-[10px] text-ink-mute">
                Carregando…
              </div>
            )}
            {!loading && habits.length === 0 && (
              <div className="px-3 py-2 font-mono text-[10px] text-ink-mute">
                Nenhum hábito ainda.
              </div>
            )}
            {habits.length > 0 && (
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
                    {habits.slice(0, 8).map((h) => (
                      <SortableRow
                        key={h.id}
                        habit={h}
                        active={h.id === selectedHabitId}
                        onClick={() => onPickHabit(h.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </>
      )}

      {/* Streak card (desktop full only) */}
      {!collapsed && (
        <div className="mt-auto rounded-md border border-border bg-bg p-3.5">
          <div className="flex items-center gap-2 text-accent">
            <HIcon name="flame" size={15} />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
              Sequência
            </span>
          </div>
          <div className="mt-2 font-display text-[26px] font-bold text-ink tracking-tighter leading-none">
            {currentStreak}{" "}
            <span className="text-[13px] font-medium text-ink-dim">dias</span>
          </div>
          <div className="mt-1 font-mono text-[10.5px] text-ink-dim">
            Recorde pessoal: {recordStreak}d
          </div>
        </div>
      )}

      {/* User tile */}
      <div
        className={cn(
          "my-3 flex items-center gap-2.5 rounded-sm bg-surface-2 p-2",
          collapsed && "justify-center p-1.5",
        )}
      >
        <div
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[rgb(10,10,10)] font-bold text-xs"
          style={{
            background:
              "linear-gradient(135deg, rgb(232, 255, 58), oklch(0.7 0.15 80))",
          }}
        >
          LP
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-ink">
                Você
              </div>
              <div className="font-mono text-[10px] text-ink-mute">
                Plano local
              </div>
            </div>
            <HIcon name="settings" size={14} color="rgb(var(--text-mute))" />
          </>
        )}
      </div>
    </aside>
  );
}

function HabitDot({ habit }: { habit: Habit }) {
  if (habit.emoji) {
    return <HabitGlyph emoji={habit.emoji} size={15} />;
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });
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
          active ? "bg-surface-3" : "hover:bg-surface-2",
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
          className="flex items-center px-1 py-1.5 text-ink-mute opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Arrastar para reordenar"
        >
          <HIcon name="grip" size={14} />
        </button>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "flex flex-1 items-center gap-2 py-1.5 pr-2 text-left text-[13px]",
            active ? "text-ink font-medium" : "text-ink-dim hover:text-ink",
          )}
        >
          <HabitDot habit={habit} />
          <span className="flex-1 truncate">{habit.name}</span>
          {habit.pausedAt && (
            <HIcon name="pause" size={11} color="currentColor" />
          )}
        </button>
      </div>
    </li>
  );
}
