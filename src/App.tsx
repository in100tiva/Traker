import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, Menu } from "lucide-react";
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
import { CommandPalette } from "@/components/CommandPalette";
import { LogoMark } from "@/components/Logo";
import { useDb } from "@/hooks/useDb";
import { useHabits } from "@/hooks/useHabits";
import { useCompletions } from "@/hooks/useCompletions";
import { usePendingToday } from "@/hooks/usePendingToday";
import { useSettings } from "@/hooks/useSettings";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useUIStore } from "@/store/useUIStore";
import { Button } from "@/components/ui/button";
import { toDateKey } from "@/lib/date";
import { incrementCount, toggleCompletion } from "@/db/queries";
import { haptics } from "@/lib/haptics";
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
    toggleShowArchived,
    editingHabit,
    setEditing,
    shortcutsOpen,
    setShortcutsOpen,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    setView,
  } = useUIStore();

  const [commandOpen, setCommandOpen] = useState(false);

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

  const selected = habits.find((h) => h.id === selectedHabitId) ?? null;

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

  const handleIncrementFromTodayView = useCallback(
    async (habitId: string, delta: number) => {
      if (!bundle) return;
      haptics.tap();
      await incrementCount(bundle.db, habitId, toDateKey(new Date()), delta);
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

  const handleCellClick = useCallback((date: Date) => {
    setNoteDate(toDateKey(date));
  }, []);

  const existingTags = useMemo(() => {
    const set = new Set<string>();
    for (const h of habits) if (h.tag) set.add(h.tag);
    return Array.from(set).sort();
  }, [habits]);

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archivedAt),
    [habits],
  );

  // Hotkeys
  useHotkeys(
    useMemo(
      () => [
        { key: "n", description: "Novo", handler: () => openCreate() },
        { key: "t", description: "Hoje", handler: () => setView("today") },
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
            if (activeView === "habit" && selected) {
              haptics.tap();
              toggle(new Date());
            }
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

  // Trigger export/import via ref to ExportImport actions
  const exportImportRef = useRef<{
    triggerExport: () => void;
    triggerImport: () => void;
  } | null>(null);

  const viewKey = `${activeView}-${selected?.id ?? "none"}-${showArchived ? "arch" : "active"}`;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
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
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b bg-surface-1 px-4 py-3 md:px-8">
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
            <LogoMark size="sm" className="md:hidden" />
            <div className="hidden md:block">
              {/* header greeting lives on the Today view hero now; keep header clean on desktop */}
              <div className="text-xs text-muted-foreground">
                {pendingToday.total === 0
                  ? "Nenhum hábito ativo"
                  : pendingToday.pending === 0
                    ? "Tudo feito hoje 🎉"
                    : `${pendingToday.pending} pendente${pendingToday.pending === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-2 md:inline-flex"
              onClick={() => setCommandOpen(true)}
              aria-label="Abrir paleta de comandos"
            >
              <Command className="h-3.5 w-3.5" />
              <span className="text-muted-foreground">Buscar</span>
              <kbd className="ml-2 hidden rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline">
                ⌘K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setCommandOpen(true)}
              aria-label="Buscar"
            >
              <Command className="h-4 w-4" />
            </Button>
            <Reminders pendingCount={pendingToday.pending} />
            <ExportImport bundle={bundle} ref={exportImportRef} />
            <ThemeToggle
              theme={settings.theme}
              onChange={(t) => updateSettings({ theme: t })}
            />
            <ShortcutsHelpButton onOpen={() => setShortcutsOpen(true)} />
          </div>
        </header>

        <section className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={viewKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {showArchived && selected ? (
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
                ) : !showArchived && activeView === "today" ? (
                  <TodayView
                    bundle={bundle}
                    habits={habits}
                    loading={loading}
                    onToggle={handleToggleFromTodayView}
                    onIncrement={handleIncrementFromTodayView}
                    onSelectHabit={(id) => {
                      setSelectedHabit(id);
                      setView("habit");
                    }}
                    onEdit={(h) => setEditing(h)}
                    onOpenCreate={openCreate}
                  />
                ) : !showArchived && activeView === "habit" && selected ? (
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
                ) : (
                  <div className="flex h-[60vh] items-center justify-center">
                    <p className="text-muted-foreground">
                      {showArchived
                        ? "Selecione um hábito arquivado."
                        : "Selecione um hábito."}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>

      <HabitForm
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        editing={editingHabit}
        existingTags={existingTags}
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

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        habits={habits}
        theme={settings.theme}
        showArchived={showArchived}
        onOpenCreate={openCreate}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onToggleTheme={() =>
          updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })
        }
        onToggleArchivedView={toggleShowArchived}
        onSelectHabit={(id) => {
          setSelectedHabit(id);
          setView("habit");
        }}
        onArchive={archive}
        onUnarchive={unarchive}
        onPause={pause}
        onResume={resume}
        onExport={() => exportImportRef.current?.triggerExport()}
        onImport={() => exportImportRef.current?.triggerImport()}
        onGoToday={() => setView("today")}
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
