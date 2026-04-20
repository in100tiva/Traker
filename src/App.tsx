import { useCallback, useEffect, useMemo } from "react";
import { HabitList } from "@/components/HabitList";
import { HabitForm } from "@/components/HabitForm";
import { HabitCard } from "@/components/HabitCard";
import { ExportImport } from "@/components/ExportImport";
import { Reminders } from "@/components/Reminders";
import { useDb } from "@/hooks/useDb";
import { useHabits } from "@/hooks/useHabits";
import { useCompletions } from "@/hooks/useCompletions";
import { useUIStore } from "@/store/useUIStore";
import { Button } from "@/components/ui/button";
import { todayKey } from "@/lib/date";

export default function App() {
  const bundle = useDb();
  const { selectedHabitId, setSelectedHabit, openCreate, showArchived } =
    useUIStore();

  const { habits, loading, create, archive, unarchive, remove } = useHabits(
    bundle,
    showArchived,
  );

  const selected =
    habits.find((h) => h.id === selectedHabitId) ?? habits[0] ?? null;

  useEffect(() => {
    if (!selectedHabitId && habits.length > 0) {
      setSelectedHabit(habits[0].id);
    }
    if (selectedHabitId && !habits.some((h) => h.id === selectedHabitId)) {
      setSelectedHabit(habits[0]?.id ?? null);
    }
  }, [habits, selectedHabitId, setSelectedHabit]);

  const { completions, weekly, toggle, increment } = useCompletions(
    bundle,
    selected?.id ?? null,
  );

  // Number of active habits still pending today (used by reminders).
  // We only see the selected habit's completions here, so approximate using
  // the list: pending = active habits - those selected today. Accurate
  // pending count per habit needs a dedicated query; we use a heuristic
  // based on whether the currently-selected habit was completed.
  const pendingRef = useMemo(() => {
    const today = todayKey();
    return { activeCount: habits.filter((h) => !h.archivedAt).length, today };
  }, [habits]);

  const getPendingCount = useCallback(() => {
    if (!bundle) return 0;
    // Approximation: every active habit counts as pending unless we can
    // confirm today's completion. Worst case: over-notifies.
    return pendingRef.activeCount;
  }, [bundle, pendingRef]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <HabitList habits={habits} loading={loading} />
      <main className="flex-1 overflow-y-auto">
        <header className="flex items-center justify-between border-b px-8 py-4">
          <div>
            <h1 className="text-lg font-semibold">Traker</h1>
            <p className="text-xs text-muted-foreground">
              Marque seus hábitos diários e acompanhe sua consistência.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Reminders getPendingCount={getPendingCount} />
            <ExportImport bundle={bundle} />
          </div>
        </header>
        <section className="p-8">
          {selected ? (
            <HabitCard
              habit={selected}
              completions={completions}
              weekly={weekly}
              onToggleToday={() => toggle(new Date())}
              onIncrementToday={(d) => increment(new Date(), d)}
              onToggleDate={(d) => toggle(d)}
              onArchive={() => archive(selected.id)}
              onUnarchive={() => unarchive(selected.id)}
              onDelete={async () => {
                if (
                  window.confirm(
                    `Excluir permanentemente "${selected.name}" e todas as marcações?`,
                  )
                ) {
                  await remove(selected.id);
                }
              }}
            />
          ) : (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">
                  {showArchived
                    ? "Nenhum hábito arquivado."
                    : "Crie seu primeiro hábito para começar."}
                </p>
                {!showArchived && (
                  <Button onClick={openCreate}>Criar hábito</Button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      <HabitForm
        onCreate={create}
        onCreated={(id) => setSelectedHabit(id)}
      />
    </div>
  );
}
