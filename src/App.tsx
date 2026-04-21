import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { HabitList } from "@/components/HabitList";
import { HabitForm, type HabitFormInput } from "@/components/HabitForm";
import { HabitCard } from "@/components/HabitCard";
import { ExportImport } from "@/components/ExportImport";
import { Reminders } from "@/components/Reminders";
import { TodayView } from "@/components/TodayView";
import { Onboarding } from "@/components/Onboarding";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ShortcutsHelp,
  ShortcutsHelpButton,
} from "@/components/ShortcutsHelp";
import { DayNoteDialog } from "@/components/DayNoteDialog";
import { useDb } from "@/hooks/useDb";
import { useHabits } from "@/hooks/useHabits";
import { useCompletions } from "@/hooks/useCompletions";
import { usePendingToday } from "@/hooks/usePendingToday";
import { useSettings } from "@/hooks/useSettings";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useUIStore } from "@/store/useUIStore";
import { Button } from "@/components/ui/button";
import { toDateKey } from "@/lib/date";
import { toggleCompletion } from "@/db/queries";
import { cn } from "@/lib/utils";
import type { DateKey } from "@/lib/date";

export default function App() {
  const bundle = useDb();
  const { settings, update: updateSettings, loaded: settingsLoaded } =
    useSettings(bundle);

  const {
    activeView,
    selectedHabitId,
    setSelectedHabit,
    openCreate,
    showArchived,
    editingHabit,
    setEditing,
    shortcutsOpen,
    setShortcutsOpen,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    setView,
  } = useUIStore();

  const {
    habits,
    loading,
    create,
    update,
    archive,
    unarchive,
    pause,
    resume,
    remove,
    hardDelete,
    reorder,
  } = useHabits(bundle, { includeArchived: showArchived, includePaused: true });

  const pendingToday = usePendingToday(bundle);

  const selected =
    habits.find((h) => h.id === selectedHabitId) ?? null;

  useEffect(() => {
    if (selectedHabitId && !habits.some((h) => h.id === selectedHabitId)) {
      setSelectedHabit(null);
      setView("today");
    }
  }, [habits, selectedHabitId, setSelectedHabit, setView]);

  const { completions, weekly, toggle, increment, updateNote } = useCompletions(
    bundle,
    activeView === "habit" ? selected?.id ?? null : null,
  );

  // Day note dialog state
  const [noteDate, setNoteDate] = useState<DateKey | null>(null);
  const noteEntry = useMemo(
    () => (noteDate ? completions.find((c) => c.date === noteDate) : null),
    [noteDate, completions],
  );

  const handleToggleFromTodayView = useCallback(
    async (habitId: string, date: Date) => {
      if (!bundle) return;
      await toggleCompletion(bundle.db, habitId, toDateKey(date));
    },
    [bundle],
  );

  const handleCreate = useCallback(
    async (input: HabitFormInput) => create(input),
    [create],
  );

  const handleUpdate = useCallback(
    async (id: string, patch: HabitFormInput) => update(id, patch),
    [update],
  );

  const handleOnboardingCreate = useCallback(
    async (inputs: HabitFormInput[]) => {
      for (const input of inputs) await create(input);
      await updateSettings({ onboardingDone: true });
    },
    [create, updateSettings],
  );

  const handleCellClick = useCallback(
    (date: Date) => {
      setNoteDate(toDateKey(date));
    },
    [],
  );

  // ------------------ Hotkeys ------------------
  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archivedAt),
    [habits],
  );

  useHotkeys(
    useMemo(
      () => [
        {
          key: "n",
          description: "Novo",
          handler: () => openCreate(),
        },
        {
          key: "t",
          description: "Hoje",
          handler: () => setView("today"),
        },
        {
          key: "?",
          shift: true,
          description: "Atalhos",
          handler: () => setShortcutsOpen(!shortcutsOpen),
        },
        {
          key: " ",
          description: "Marcar hoje",
          handler: () => {
            if (activeView === "habit" && selected) toggle(new Date());
          },
        },
        {
          key: "j",
          description: "Próximo hábito",
          handler: () => {
            if (activeHabits.length === 0) return;
            const idx = selectedHabitId
              ? activeHabits.findIndex((h) => h.id === selectedHabitId)
              : -1;
            const next = activeHabits[(idx + 1) % activeHabits.length];
            setSelectedHabit(next.id);
            setView("habit");
          },
        },
        {
          key: "ArrowDown",
          description: "Próximo hábito",
          handler: () => {
            if (activeHabits.length === 0) return;
            const idx = selectedHabitId
              ? activeHabits.findIndex((h) => h.id === selectedHabitId)
              : -1;
            const next = activeHabits[(idx + 1) % activeHabits.length];
            setSelectedHabit(next.id);
            setView("habit");
          },
        },
        {
          key: "k",
          description: "Hábito anterior",
          handler: () => {
            if (activeHabits.length === 0) return;
            const idx = selectedHabitId
              ? activeHabits.findIndex((h) => h.id === selectedHabitId)
              : 0;
            const prev =
              activeHabits[(idx - 1 + activeHabits.length) % activeHabits.length];
            setSelectedHabit(prev.id);
            setView("habit");
          },
        },
        {
          key: "ArrowUp",
          description: "Hábito anterior",
          handler: () => {
            if (activeHabits.length === 0) return;
            const idx = selectedHabitId
              ? activeHabits.findIndex((h) => h.id === selectedHabitId)
              : 0;
            const prev =
              activeHabits[(idx - 1 + activeHabits.length) % activeHabits.length];
            setSelectedHabit(prev.id);
            setView("habit");
          },
        },
      ],
      [
        openCreate,
        setView,
        setShortcutsOpen,
        shortcutsOpen,
        activeView,
        selected,
        toggle,
        activeHabits,
        selectedHabitId,
        setSelectedHabit,
      ],
    ),
  );

  const showOnboarding =
    settingsLoaded && !settings.onboardingDone && habits.length === 0;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar: always visible on md+, drawer on mobile */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 md:static md:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "transition-transform md:translate-x-0",
        )}
      >
        <HabitList habits={habits} loading={loading} onReorder={reorder} />
      </div>
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between gap-2 border-b px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={toggleSidebar}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Traker</h1>
              <p className="hidden text-xs text-muted-foreground md:block">
                {pendingToday.total === 0
                  ? "Nenhum hábito ativo."
                  : pendingToday.pending === 0
                    ? "Tudo feito hoje 🎉"
                    : `${pendingToday.pending} hábito${pendingToday.pending === 1 ? "" : "s"} pendente${pendingToday.pending === 1 ? "" : "s"} hoje`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Reminders pendingCount={pendingToday.pending} />
            <ExportImport bundle={bundle} />
            <ThemeToggle
              theme={settings.theme}
              onChange={(t) => updateSettings({ theme: t })}
            />
            <ShortcutsHelpButton onOpen={() => setShortcutsOpen(true)} />
          </div>
        </header>
        <section className="p-4 md:p-8">
          {showArchived && selected && (
            <HabitCard
              bundle={bundle}
              habit={selected}
              completions={completions}
              weekly={weekly}
              retroactiveLimitDays={settings.retroactiveLimitDays}
              onToggleToday={() => toggle(new Date())}
              onIncrementToday={(d) => increment(new Date(), d)}
              onCellClick={handleCellClick}
              onArchive={() => archive(selected.id, selected.name)}
              onUnarchive={() => unarchive(selected.id)}
              onPause={() => pause(selected.id)}
              onResume={() => resume(selected.id)}
              onEdit={() => setEditing(selected)}
              onDelete={async () => {
                if (
                  window.confirm(
                    `Excluir permanentemente "${selected.name}" e todas as marcações?`,
                  )
                ) {
                  await hardDelete(selected.id);
                  setSelectedHabit(null);
                  setView("today");
                }
              }}
            />
          )}

          {!showArchived && activeView === "today" && (
            <TodayView
              bundle={bundle}
              habits={habits}
              onToggle={handleToggleFromTodayView}
              onSelectHabit={(id) => {
                setSelectedHabit(id);
                setView("habit");
              }}
              onEdit={(h) => setEditing(h)}
            />
          )}

          {!showArchived && activeView === "habit" && selected && (
            <HabitCard
              bundle={bundle}
              habit={selected}
              completions={completions}
              weekly={weekly}
              retroactiveLimitDays={settings.retroactiveLimitDays}
              onToggleToday={() => toggle(new Date())}
              onIncrementToday={(d) => increment(new Date(), d)}
              onCellClick={handleCellClick}
              onArchive={() => {
                archive(selected.id, selected.name);
                setView("today");
              }}
              onUnarchive={() => unarchive(selected.id)}
              onPause={() => pause(selected.id)}
              onResume={() => resume(selected.id)}
              onEdit={() => setEditing(selected)}
              onDelete={() => {
                remove(selected.id, selected.name);
                setView("today");
              }}
            />
          )}

          {!showArchived && activeView === "habit" && !selected && (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">
                  Selecione um hábito na barra lateral.
                </p>
                <Button onClick={() => setView("today")}>Ver hoje</Button>
              </div>
            </div>
          )}

          {showArchived && !selected && (
            <div className="flex h-[60vh] items-center justify-center">
              <p className="text-muted-foreground">
                Selecione um hábito arquivado para ver detalhes.
              </p>
            </div>
          )}
        </section>
      </main>

      <HabitForm
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        editing={editingHabit}
        onCreated={(id) => {
          setSelectedHabit(id);
          setView("habit");
        }}
        onCloseEdit={() => setEditing(null)}
      />

      <ShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <DayNoteDialog
        open={noteDate !== null}
        onOpenChange={(open) => !open && setNoteDate(null)}
        date={noteDate}
        initialNote={noteEntry?.note ?? null}
        habitName={selected?.name ?? ""}
        done={Boolean(noteEntry && noteEntry.count > 0)}
        onSave={(note) => noteDate && updateNote(new Date(noteDate), note)}
        onToggleDone={() => {
          if (noteDate) toggle(new Date(noteDate));
        }}
      />

      {showOnboarding && (
        <Onboarding
          open={showOnboarding}
          onCreate={handleOnboardingCreate}
          onSkip={() => updateSettings({ onboardingDone: true })}
        />
      )}
    </div>
  );
}
