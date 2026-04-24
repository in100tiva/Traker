import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HabitForm, type HabitFormInput } from "@/components/HabitForm";
import { ExportImport } from "@/components/ExportImport";
import { Reminders } from "@/components/Reminders";
import { TodayView } from "@/components/TodayView";
import { Onboarding } from "@/components/Onboarding";
import { HabitDetail } from "@/components/HabitDetail";
import {
  ShortcutsHelp,
  ShortcutsHelpButton,
} from "@/components/ShortcutsHelp";
import { DayNoteDialog } from "@/components/DayNoteDialog";
import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useDb } from "@/hooks/useDb";
import { useHabits } from "@/hooks/useHabits";
import { useCompletions } from "@/hooks/useCompletions";
import { useSettings } from "@/hooks/useSettings";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useUIStore } from "@/store/useUIStore";
import { toDateKey } from "@/lib/date";
import { toggleCompletion } from "@/db/queries";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { DateKey } from "@/lib/date";

export default function App() {
  const bundle = useDb();
  const { settings, update: updateSettings, loaded: settingsLoaded } =
    useSettings(bundle);

  const {
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

  const selected = habits.find((h) => h.id === selectedHabitId) ?? null;

  // Auto-select first habit when none is selected
  useEffect(() => {
    if (!selectedHabitId && habits.length > 0 && !showArchived) {
      setSelectedHabit(habits[0].id);
    }
    if (selectedHabitId && !habits.some((h) => h.id === selectedHabitId)) {
      setSelectedHabit(habits[0]?.id ?? null);
    }
  }, [habits, selectedHabitId, setSelectedHabit, showArchived]);

  const { completions, weekly, toggle, increment, updateNote } = useCompletions(
    bundle,
    selected?.id ?? null,
  );

  const [noteDate, setNoteDate] = useState<DateKey | null>(null);
  const noteEntry = useMemo(
    () => (noteDate ? completions.find((c) => c.date === noteDate) : null),
    [noteDate, completions],
  );

  const handleToggleAny = useCallback(
    async (habitId: string, date: Date) => {
      if (!bundle) return;
      await toggleCompletion(bundle.db, habitId, toDateKey(date));
    },
    [bundle],
  );

  // For the hero "current/record streak" calc: we want streak info for each
  // habit. TodayView fetches this itself — we just hand it the bundle + habits.
  const [heroStreak, setHeroStreak] = useState({ current: 0, record: 0 });
  useEffect(() => {
    if (!bundle || habits.length === 0) {
      setHeroStreak({ current: 0, record: 0 });
      return;
    }
    let cancelled = false;
    (async () => {
      let maxCurrent = 0;
      let maxRecord = 0;
      for (const h of habits) {
        const { rows } = await bundle.pg.query<{ date: string }>(
          `SELECT date::text AS date FROM completions
             WHERE habit_id = $1 ORDER BY date ASC LIMIT 2000`,
          [h.id],
        );
        const dates = rows.map((r) => r.date);
        const { calculateCurrentStreak, calculateLongestStreak } = await import(
          "@/lib/streak"
        );
        const { ALL_DAYS_SCHEDULE } = await import("@/lib/schedule");
        const today = toDateKey(new Date());
        const sch = h.schedule ?? ALL_DAYS_SCHEDULE;
        const cur = calculateCurrentStreak(dates, today, sch);
        const rec = calculateLongestStreak(dates, sch);
        if (cur > maxCurrent) maxCurrent = cur;
        if (rec > maxRecord) maxRecord = rec;
      }
      if (!cancelled) setHeroStreak({ current: maxCurrent, record: maxRecord });
    })();
    return () => {
      cancelled = true;
    };
  }, [bundle, habits]);

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
            if (selected) {
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
          },
        },
        {
          key: "ArrowDown",
          description: "Próximo",
          handler: () => {
            if (activeHabits.length === 0) return;
            const idx = selectedHabitId
              ? activeHabits.findIndex((h) => h.id === selectedHabitId)
              : -1;
            const next = activeHabits[(idx + 1) % activeHabits.length];
            setSelectedHabit(next.id);
          },
        },
        {
          key: "k",
          description: "Anterior",
          handler: () => {
            if (activeHabits.length === 0) return;
            const idx = selectedHabitId
              ? activeHabits.findIndex((h) => h.id === selectedHabitId)
              : 0;
            const prev =
              activeHabits[
                (idx - 1 + activeHabits.length) % activeHabits.length
              ];
            setSelectedHabit(prev.id);
          },
        },
        {
          key: "ArrowUp",
          description: "Anterior",
          handler: () => {
            if (activeHabits.length === 0) return;
            const idx = selectedHabitId
              ? activeHabits.findIndex((h) => h.id === selectedHabitId)
              : 0;
            const prev =
              activeHabits[
                (idx - 1 + activeHabits.length) % activeHabits.length
              ];
            setSelectedHabit(prev.id);
          },
        },
      ],
      [
        openCreate,
        setShortcutsOpen,
        shortcutsOpen,
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

  const exportImportRef = useRef<{
    triggerExport: () => void;
    triggerImport: () => void;
  } | null>(null);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-ink">
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 md:static md:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "transition-transform md:translate-x-0",
        )}
      >
        <Sidebar
          habits={habits}
          loading={loading}
          onReorder={reorder}
          currentStreak={heroStreak.current}
          recordStreak={heroStreak.record}
        />
      </div>
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          onOpenCommand={() => setCommandOpen(true)}
          onOpenCreate={openCreate}
          onToggleSidebar={toggleSidebar}
          breadcrumbParent="Painel"
          actions={
            <>
              <div className="hidden sm:flex sm:items-center sm:gap-1">
                <Reminders pendingCount={0} />
              </div>
              <ExportImport bundle={bundle} ref={exportImportRef} />
              <div className="hidden md:flex md:items-center md:gap-1">
                <ShortcutsHelpButton onOpen={() => setShortcutsOpen(true)} />
              </div>
            </>
          }
        />

        <section className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-5 md:px-6 md:py-6 lg:px-7">
            {showArchived ? (
              <div className="flex flex-col gap-6 xl:flex-row">
                <div className="xl:w-[360px] xl:shrink-0">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="font-display text-[17px] font-semibold text-ink tracking-tighter">
                        Hábitos arquivados
                      </div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-ink-dim">
                        Dados preservados para restauração
                      </div>
                    </div>
                  </div>
                  {habits.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border bg-surface/30 p-8 text-center font-mono text-[11px] text-ink-mute">
                      Nenhum arquivado.
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {habits.map((h) => (
                        <li key={h.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedHabit(h.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                              selected?.id === h.id
                                ? "border-border-strong bg-surface-2"
                                : "border-border bg-surface hover:bg-surface-2",
                            )}
                          >
                            <span className="text-base">{h.emoji ?? "•"}</span>
                            <span className="flex-1 truncate text-[13px] text-ink">
                              {h.name}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] text-ink-mute">
                              {h.tag ?? "—"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {selected ? (
                    <HabitDetail
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
                            `Excluir permanentemente "${selected.name}"?`,
                          )
                        ) {
                          await hardDelete(selected.id);
                          setSelectedHabit(null);
                          setView("today");
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 font-mono text-[11px] text-ink-mute">
                      Selecione um hábito arquivado
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <TodayView
                bundle={bundle}
                habits={habits}
                selected={selected}
                detailCompletions={completions}
                detailWeekly={weekly}
                retroactiveLimitDays={settings.retroactiveLimitDays}
                onSelectHabit={(id) => setSelectedHabit(id)}
                onToggleAny={handleToggleAny}
                onToggleDetailToday={() => toggle(new Date())}
                onIncrementDetailToday={(d) => increment(new Date(), d)}
                onEditDetail={() => selected && setEditing(selected)}
                onArchiveDetail={() =>
                  selected && archive(selected.id, selected.name)
                }
                onUnarchiveDetail={() => selected && unarchive(selected.id)}
                onPauseDetail={() => selected && pause(selected.id)}
                onResumeDetail={() => selected && resume(selected.id)}
                onDeleteDetail={() =>
                  selected && remove(selected.id, selected.name)
                }
                onCellClickDetail={handleCellClick}
                onOpenCreate={openCreate}
              />
            )}
          </div>
        </section>
      </main>

      <HabitForm
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        editing={editingHabit}
        existingTags={existingTags}
        onCreated={(id) => setSelectedHabit(id)}
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
        theme="dark"
        showArchived={showArchived}
        onOpenCreate={openCreate}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onToggleTheme={() => {
          /* dark-only while we ship the Streaks design */
        }}
        onToggleArchivedView={toggleShowArchived}
        onSelectHabit={(id) => setSelectedHabit(id)}
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
