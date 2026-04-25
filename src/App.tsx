import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HabitForm, type HabitFormInput } from "@/components/HabitForm";
import { ExportImport } from "@/components/ExportImport";
import { Reminders } from "@/components/Reminders";
import { TodayView } from "@/components/TodayView";
import { Onboarding } from "@/components/Onboarding";
import { HabitsManagementView } from "@/components/HabitsManagementView";
import { AnalyticsView } from "@/components/AnalyticsView";
import { CalendarView } from "@/components/CalendarView";
import { AchievementsView } from "@/components/AchievementsView";
import {
  ShortcutsHelp,
  ShortcutsHelpButton,
} from "@/components/ShortcutsHelp";
import { DayNoteDialog } from "@/components/DayNoteDialog";
import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { BottomNav } from "@/components/BottomNav";
import { useDb } from "@/hooks/useDb";
import { useHabits } from "@/hooks/useHabits";
import { useCompletions } from "@/hooks/useCompletions";
import { useSettings } from "@/hooks/useSettings";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useUIStore } from "@/store/useUIStore";
import { toDateKey } from "@/lib/date";
import { toggleCompletion, eventsCount, recordEvent, recordXp } from "@/db/queries";
import { haptics } from "@/lib/haptics";
import { bootstrap, trackActivationOnFirstCheck } from "@/lib/bootstrap";
import { xpForCheck } from "@/lib/gamification";
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

  const isMobile = useMediaQuery("(max-width: 759px)");
  const isTablet = useMediaQuery("(min-width: 760px) and (max-width: 1099px)");

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
  } = useHabits(bundle, { includeArchived: true, includePaused: true });

  const visibleHabits = useMemo(
    () => (showArchived ? habits : habits.filter((h) => !h.archivedAt)),
    [habits, showArchived],
  );

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archivedAt),
    [habits],
  );

  const selected = habits.find((h) => h.id === selectedHabitId) ?? null;

  useEffect(() => {
    const firstActive = habits.find((h) => !h.archivedAt);
    if (!selectedHabitId && firstActive) setSelectedHabit(firstActive.id);
    if (selectedHabitId && !habits.some((h) => h.id === selectedHabitId)) {
      setSelectedHabit(firstActive?.id ?? null);
    }
  }, [habits, selectedHabitId, setSelectedHabit]);

  const { completions, weekly, toggle, increment, updateNote } = useCompletions(
    bundle,
    selected?.id ?? null,
  );

  const [noteDate, setNoteDate] = useState<DateKey | null>(null);
  const noteEntry = useMemo(
    () => (noteDate ? completions.find((c) => c.date === noteDate) : null),
    [noteDate, completions],
  );

  // Bootstrap: install_id, timezone, app_open, re-engagement detection
  useEffect(() => {
    if (!bundle) return;
    void bootstrap(bundle);
  }, [bundle]);

  const handleToggleAny = useCallback(
    async (habitId: string, date: Date) => {
      if (!bundle) return;
      const result = await toggleCompletion(bundle.db, habitId, toDateKey(date));
      if (result === "created") {
        // Track event + grant XP. Streak-aware XP requires a fresh streak
        // count which we don't have at hand here; pass 0 → caller granular
        // version (Fase 2) will pass the real streak.
        const isFirstEverCheck =
          (await eventsCount(bundle.db, "habit_check")) === 0;
        await recordEvent(bundle.db, {
          type: "habit_check",
          payload: { habitId },
        });
        await recordXp(bundle.db, {
          amount: xpForCheck(0),
          kind: "habit_check",
          habitId,
        });
        if (isFirstEverCheck) {
          await trackActivationOnFirstCheck(bundle);
        }
      }
    },
    [bundle],
  );

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
      const { calculateCurrentStreak, calculateLongestStreak } = await import(
        "@/lib/streak"
      );
      const { ALL_DAYS_SCHEDULE } = await import("@/lib/schedule");
      const today = toDateKey(new Date());
      for (const h of habits) {
        if (h.archivedAt) continue;
        const { rows } = await bundle.pg.query<{ date: string }>(
          `SELECT date::text AS date FROM completions
             WHERE habit_id = $1 ORDER BY date ASC LIMIT 2000`,
          [h.id],
        );
        const dates = rows.map((r) => r.date);
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

  useHotkeys(
    useMemo(
      () => [
        { key: "n", description: "Novo", handler: () => openCreate() },
        { key: "t", description: "Hoje", handler: () => setView("today") },
        { key: "h", description: "Hábitos", handler: () => setView("habits") },
        { key: "a", description: "Análise", handler: () => setView("stats") },
        {
          key: "c",
          description: "Calendário",
          handler: () => setView("calendar"),
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
            if (selected && activeView === "today") {
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
          key: "k",
          description: "Hábito anterior",
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
        setView,
        setShortcutsOpen,
        shortcutsOpen,
        selected,
        toggle,
        activeHabits,
        selectedHabitId,
        setSelectedHabit,
        activeView,
      ],
    ),
  );

  const showOnboarding =
    settingsLoaded && !settings.onboardingDone && habits.length === 0;

  const exportImportRef = useRef<{
    triggerExport: () => void;
    triggerImport: () => void;
  } | null>(null);

  const topbarActions = (
    <>
      {!isMobile && <Reminders pendingCount={0} />}
      <ExportImport bundle={bundle} ref={exportImportRef} />
      {!isMobile && (
        <ShortcutsHelpButton onOpen={() => setShortcutsOpen(true)} />
      )}
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-bg text-ink">
      {/* Sidebar — visible desktop/tablet, drawer mobile */}
      {!isMobile && (
        <Sidebar
          habits={activeHabits}
          loading={loading}
          onReorder={reorder}
          currentStreak={heroStreak.current}
          recordStreak={heroStreak.record}
          collapsed={isTablet}
        />
      )}
      {isMobile && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-40">
            <Sidebar
              habits={activeHabits}
              loading={loading}
              onReorder={reorder}
              currentStreak={heroStreak.current}
              recordStreak={heroStreak.record}
            />
          </div>
        </>
      )}

      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isMobile && "pb-[92px]",
        )}
      >
        <Topbar
          onOpenCreate={openCreate}
          showSidebarToggle={isMobile}
          onToggleSidebar={toggleSidebar}
          actions={topbarActions}
        />

        <section className="flex-1">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-5 md:px-6 md:py-6 lg:px-7">
            {activeView === "today" && (
              <TodayView
                bundle={bundle}
                habits={visibleHabits}
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

            {activeView === "habits" && (
              <HabitsManagementView
                bundle={bundle}
                habits={habits}
                onOpenCreate={openCreate}
                onEdit={(h) => setEditing(h)}
                onArchive={archive}
                onUnarchive={unarchive}
                onPause={pause}
                onResume={resume}
                onDelete={async (id) => {
                  await hardDelete(id);
                }}
                onSelect={(id) => {
                  setSelectedHabit(id);
                  setView("today");
                }}
              />
            )}

            {activeView === "stats" && (
              <AnalyticsView bundle={bundle} habits={activeHabits} />
            )}

            {activeView === "calendar" && (
              <CalendarView bundle={bundle} habits={activeHabits} />
            )}

            {activeView === "achievements" && (
              <AchievementsView bundle={bundle} habits={activeHabits} />
            )}
          </div>
        </section>
      </main>

      {isMobile && <BottomNav />}

      <HabitForm
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        editing={editingHabit}
        existingTags={existingTags}
        onCreated={(id) => {
          setSelectedHabit(id);
          setView("today");
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
        theme="dark"
        showArchived={showArchived}
        onOpenCreate={openCreate}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onToggleTheme={() => {}}
        onToggleArchivedView={toggleShowArchived}
        onSelectHabit={(id) => {
          setSelectedHabit(id);
          setView("today");
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
