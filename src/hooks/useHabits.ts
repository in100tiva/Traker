import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DbBundle } from "@/db/client";
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  unarchiveHabit,
} from "@/db/queries";
import type { Habit } from "@/db/schema";

interface HabitRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  target_per_week: number;
  archived_at: string | null;
  created_at: string;
}

function toHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    color: r.color,
    targetPerWeek: r.target_per_week,
    archivedAt: r.archived_at ? new Date(r.archived_at) : null,
    createdAt: new Date(r.created_at),
  };
}

export function useHabits(bundle: DbBundle | null, includeArchived = false) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bundle) return;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const sql = includeArchived
      ? "SELECT * FROM habits ORDER BY created_at ASC"
      : "SELECT * FROM habits WHERE archived_at IS NULL ORDER BY created_at ASC";

    bundle.pg.live
      .query<HabitRow>(sql, [], (res) => {
        if (cancelled) return;
        setHabits(res.rows.map(toHabit));
        setLoading(false);
      })
      .then((sub) => {
        if (cancelled) {
          sub.unsubscribe();
          return;
        }
        unsubscribe = sub.unsubscribe;
      })
      .catch((err) => {
        console.error("[habits] live query failed", err);
        toast.error("Falha ao carregar hábitos");
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [bundle, includeArchived]);

  const create = useCallback(
    async (input: {
      name: string;
      description?: string | null;
      color?: string;
      targetPerWeek?: number;
    }) => {
      if (!bundle) return null;
      try {
        const row = await createHabit(bundle.db, input);
        toast.success(`Hábito "${row.name}" criado`);
        return row;
      } catch (err) {
        console.error(err);
        toast.error("Falha ao criar hábito", {
          description: (err as Error).message,
        });
        return null;
      }
    },
    [bundle],
  );

  const archive = useCallback(
    async (id: string) => {
      if (!bundle) return;
      try {
        await archiveHabit(bundle.db, id);
        toast.success("Hábito arquivado");
      } catch (err) {
        toast.error("Falha ao arquivar", { description: (err as Error).message });
      }
    },
    [bundle],
  );

  const unarchive = useCallback(
    async (id: string) => {
      if (!bundle) return;
      try {
        await unarchiveHabit(bundle.db, id);
        toast.success("Hábito restaurado");
      } catch (err) {
        toast.error("Falha ao restaurar", { description: (err as Error).message });
      }
    },
    [bundle],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!bundle) return;
      try {
        await deleteHabit(bundle.db, id);
        toast.success("Hábito excluído");
      } catch (err) {
        toast.error("Falha ao excluir", { description: (err as Error).message });
      }
    },
    [bundle],
  );

  return { habits, loading, create, archive, unarchive, remove };
}
