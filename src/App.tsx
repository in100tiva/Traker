import { useEffect } from "react";
import { HabitList } from "@/components/HabitList";
import { HabitForm } from "@/components/HabitForm";
import { HabitCard } from "@/components/HabitCard";
import { useDb } from "@/hooks/useDb";
import { useHabits } from "@/hooks/useHabits";
import { useCompletions } from "@/hooks/useCompletions";
import { useUIStore } from "@/store/useUIStore";
import { Button } from "@/components/ui/button";

export default function App() {
  const db = useDb();
  const { habits, loading, create, remove } = useHabits(db);
  const { selectedHabitId, setSelectedHabit, openCreate } = useUIStore();

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

  const { completions, weekly, toggle } = useCompletions(db, selected?.id ?? null);

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
        </header>
        <section className="p-8">
          {selected ? (
            <HabitCard
              habit={selected}
              completions={completions}
              weekly={weekly}
              onToggleToday={() => toggle(new Date())}
              onToggleDate={(d) => toggle(d)}
              onDelete={async () => {
                if (confirm(`Excluir "${selected.name}"?`)) {
                  await remove(selected.id);
                }
              }}
            />
          ) : (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">
                  Crie seu primeiro hábito para começar.
                </p>
                <Button onClick={openCreate}>Criar hábito</Button>
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
