import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HabitForm, type HabitFormInput } from "@/components/HabitForm";
import { HabitCreatorBJFogg } from "@/components/HabitCreatorBJFogg";
import { ExportImport } from "@/components/ExportImport";
import { Reminders } from "@/components/Reminders";
import { TodayView } from "@/components/TodayView";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { XpBurstHost } from "@/components/XpBurst";
import { LevelBadge } from "@/components/LevelBadge";
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
import {
  toggleCompletion,
  eventsCount,
  recordEvent,
  recordXp,
  getXpTotal,
  createHabit,
} from "@/db/queries";
import { haptics } from "@/lib/haptics";
import { bootstrap, trackActivationOnFirstCheck } from "@/lib/bootstrap";
import {
  xpForCheck,
  xpForMilestone,
  MILESTONE_GRANT,
} from "@/lib/gamification";
import { ALL_DAYS_SCHEDULE } from "@/lib/schedule";
import { calculateCurrentStreak } from "@/lib/streak";
import { maybeDrop, type DropContext } from "@/lib/random-rewards";
import { fireXpBurst } from "@/components/XpBurst";
import { celebrateMilestone } from "@/lib/milestones";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
  const [bjFoggOpen, setBjFoggOpen] = useState(false);

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

  /**
   * Compute the streak count for a habit before the current toggle.
   * Used to size the XP grant and to detect milestone crossings.
   */
  const computeStreakBefore = useCallback(
    async (habitId: string, beforeKey: DateKey, schedule: number) => {
      if (!bundle) return 0;
      const { rows } = await bundle.pg.query<{ date: string }>(
        `SELECT date::text AS date FROM completions
           WHERE habit_id = $1 AND date < $2
           ORDER BY date DESC LIMIT 500`,
        [habitId, beforeKey],
      );
      const dates = rows.map((r) => r.date);
      // Pretend "today" was beforeKey to use the existing streak helper
      const yesterday = new Date(beforeKey + "T00:00:00");
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = toDateKey(yesterday);
      return calculateCurrentStreak(dates, yesterdayKey, schedule);
    },
    [bundle],
  );

  const [heroXpTotal, setHeroXpTotal] = useState(0);
  useEffect(() => {
    if (!bundle) return;
    void getXpTotal(bundle.db).then(setHeroXpTotal);
  }, [bundle]);

  const handleToggleAny = useCallback(
    async (habitId: string, date: Date, sourceEl?: Element | null) => {
      if (!bundle) return;
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      const dateKey = toDateKey(date);
      const result = await toggleCompletion(bundle.db, habitId, dateKey);

      if (result !== "created") return;

      const schedule = habit.schedule ?? ALL_DAYS_SCHEDULE;
      const streakBefore = await computeStreakBefore(habitId, dateKey, schedule);
      const newStreak = streakBefore + 1;

      const baseXp = xpForCheck(streakBefore);
      await recordEvent(bundle.db, {
        type: "habit_check",
        payload: { habitId, streak: newStreak },
      });
      await recordXp(bundle.db, {
        amount: baseXp,
        kind: "habit_check",
        habitId,
        payload: { streak: newStreak },
      });
      fireXpBurst(baseXp, sourceEl);
      haptics.tap();

      // First check ever → record activation
      const totalChecks = await eventsCount(bundle.db, "habit_check");
      if (totalChecks === 1) {
        await trackActivationOnFirstCheck(bundle);
      }

      // Milestone reached?
      const milestoneXp = xpForMilestone(newStreak);
      if (milestoneXp > 0 && MILESTONE_GRANT[newStreak] !== undefined) {
        await recordXp(bundle.db, {
          amount: milestoneXp,
          kind: "milestone",
          habitId,
          payload: { streak: newStreak },
        });
        celebrateMilestone(newStreak, habit.name);
      }

      // Variable reward — rare and pleasant
      const lastDropEvent = await bundle.pg.query<{ created_at: string }>(
        `SELECT created_at FROM events WHERE type = 'drop_grant' ORDER BY created_at DESC LIMIT 1`,
      );
      const checksSinceLastDrop = await bundle.pg.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM events
           WHERE type = 'habit_check' AND created_at > COALESCE(
             (SELECT created_at FROM events WHERE type='drop_grant' ORDER BY created_at DESC LIMIT 1),
             '1970-01-01'
           )`,
      );
      const dropCtx: DropContext = {
        checksSinceLastDrop: Number(
          checksSinceLastDrop.rows[0]?.count ?? "0",
        ),
        hoursSinceLastDrop: lastDropEvent.rows[0]
          ? (Date.now() -
              new Date(lastDropEvent.rows[0].created_at).getTime()) /
            3_600_000
          : 9999,
      };
      const drop = maybeDrop(dropCtx);
      if (drop) {
        await recordEvent(bundle.db, {
          type: "drop_grant",
          payload: { rarity: drop.rarity, dropId: drop.id, bonusXp: drop.bonusXp },
        });
        await recordXp(bundle.db, {
          amount: drop.bonusXp,
          kind: "drop",
          habitId,
          payload: { rarity: drop.rarity, dropId: drop.id },
        });
        toast.success(`${drop.emoji} ${drop.message}`, {
          description: `+${drop.bonusXp} XP bônus`,
          duration: 5000,
        });
        fireXpBurst(drop.bonusXp);
      }

      // Refresh hero XP cache
      const total = await getXpTotal(bundle.db);
      setHeroXpTotal(total);
    },
    [bundle, habits, computeStreakBefore],
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
      {!isMobile && (
        <LevelBadge totalXp={heroXpTotal} compact className="mr-1" />
      )}
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

      <HabitCreatorBJFogg
        open={bjFoggOpen}
        onOpenChange={setBjFoggOpen}
        anchorOptions={activeHabits.map((h) => ({
          id: h.id,
          name: h.name,
          emoji: h.emoji,
        }))}
        onCreate={async (input) => {
          if (!bundle) return;
          await createHabit(bundle.db, input);
          await recordEvent(bundle.db, {
            type: "habit_create",
            payload: { method: "bj_fogg", triggerType: input.triggerType },
          });
          toast.success("Hábito guiado criado", {
            description: "Gatilho + ação mínima + recompensa pronta.",
          });
        }}
      />

      {showOnboarding && (
        <OnboardingFlow
          open={showOnboarding}
          onSkip={async () => {
            await updateSettings({ onboardingDone: true });
            if (bundle) {
              await recordEvent(bundle.db, {
                type: "onboarding_skipped",
              });
            }
          }}
          onComplete={async ({ name, declaredGoal, habit }) => {
            await create(habit);
            await updateSettings({ onboardingDone: true });
            if (bundle) {
              await recordEvent(bundle.db, {
                type: "onboarding_completed",
                payload: { declaredGoal },
              });
              await recordXp(bundle.db, {
                amount: 25,
                kind: "onboarding",
                payload: { declaredGoal },
              });
            }
            toast.success(
              `Bem-vindo, ${name}! +25 XP de boas-vindas.`,
            );
          }}
        />
      )}

      <XpBurstHost />
    </div>
  );
}
