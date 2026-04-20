import { useCallback, useEffect, useState } from "react";
import type { DB } from "@/db/client";
import { createHabit, deleteHabit, listHabits } from "@/db/queries";
import type { Habit } from "@/db/schema";

export function useHabits(db: DB | null) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const rows = await listHabits(db);
    setHabits(rows);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: { name: string; description?: string | null; color?: string }) => {
      if (!db) return null;
      const row = await createHabit(db, input);
      await refresh();
      return row;
    },
    [db, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!db) return;
      await deleteHabit(db, id);
      await refresh();
    },
    [db, refresh],
  );

  return { habits, loading, refresh, create, remove };
}
