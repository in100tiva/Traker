import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DbBundle } from "@/db/client";
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  pauseHabit,
  reorderHabits,
  resumeHabit,
  unarchiveHabit,
  updateHabit,
} from "@/db/queries";
import type { Habit } from "@/db/schema";

interface HabitRow {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: string;
  target_per_week: number;
  target_per_day: number | null;
  unit: string | null;
  is_negative: boolean;
  tag: string | null;
  schedule: number;
  sort_order: number;
  paused_at: string | null;
  archived_at: string | null;
  created_at: string;
}

function toHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    emoji: r.emoji,
    color: r.color,
    targetPerWeek: r.target_per_week,
    targetPerDay: r.target_per_day,
    unit: r.unit,
    isNegative: r.is_negative,
    tag: r.tag,
    schedule: r.schedule,
    sortOrder: r.sort_order,
    pausedAt: r.paused_at ? new Date(r.paused_at) : null,
    archivedAt: r.archived_at ? new Date(r.archived_at) : null,
    createdAt: new Date(r.created_at),
  };
}

export interface UseHabitsOptions {
  includeArchived?: boolean;
  includePaused?: boolean;
}

export function useHabits(
  bundle: DbBundle | null,
  options: UseHabitsOptions = {},
) {
  const { includeArchived = false, includePaused = true } = options;
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bundle) return;
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const where: string[] = [];
    if (!includeArchived) where.push("archived_at IS NULL");
    if (!includePaused) where.push("paused_at IS NULL");
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sql = `SELECT * FROM habits ${whereSql} ORDER BY sort_order ASC, created_at ASC`;

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
  }, [bundle, includeArchived, includePaused]);

  const create = useCallback(
    async (input: Parameters<typeof createHabit>[1]) => {
      if (!bundle) return null;
      try {
        const row = await createHabit(bundle.db, input);
        toast.success(`Hábito "${row.name}" criado`);
        return row;
      } catch (err) {
        toast.error("Falha ao criar hábito", {
          description: (err as Error).message,
        });
        return null;
      }
    },
    [bundle],
  );

  const update = useCallback(
    async (id: string, patch: Parameters<typeof updateHabit>[2]) => {
      if (!bundle) return;
      try {
        await updateHabit(bundle.db, id, patch);
      } catch (err) {
        toast.error("Falha ao atualizar hábito", {
          description: (err as Error).message,
        });
      }
    },
    [bundle],
  );

  const archiveWithUndo = useCallback(
    async (id: string, name: string) => {
      if (!bundle) return;
      await archiveHabit(bundle.db, id);
      toast("Hábito arquivado", {
        description: name,
        action: {
          label: "Desfazer",
          onClick: () => {
            void unarchiveHabit(bundle.db, id);
          },
        },
      });
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
        toast.error("Falha ao restaurar", {
          description: (err as Error).message,
        });
      }
    },
    [bundle],
  );

  const pause = useCallback(
    async (id: string) => {
      if (!bundle) return;
      await pauseHabit(bundle.db, id);
      toast("Hábito pausado", {
        description: "Não quebra streak; não aparece em 'Hoje'.",
        action: {
          label: "Retomar",
          onClick: () => {
            void resumeHabit(bundle.db, id);
          },
        },
      });
    },
    [bundle],
  );

  const resume = useCallback(
    async (id: string) => {
      if (!bundle) return;
      await resumeHabit(bundle.db, id);
      toast.success("Hábito retomado");
    },
    [bundle],
  );

  const remove = useCallback(
    async (id: string, name: string) => {
      if (!bundle) return;
      // Soft-delete via archive to enable undo; user can hard-delete from archive view.
      await archiveHabit(bundle.db, id);
      toast("Hábito excluído", {
        description: `"${name}" foi movido para arquivados.`,
        action: {
          label: "Desfazer",
          onClick: () => {
            void unarchiveHabit(bundle.db, id);
          },
        },
      });
    },
    [bundle],
  );

  const hardDelete = useCallback(
    async (id: string) => {
      if (!bundle) return;
      await deleteHabit(bundle.db, id);
      toast.success("Hábito removido permanentemente");
    },
    [bundle],
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      if (!bundle) return;
      await reorderHabits(bundle.db, orderedIds);
    },
    [bundle],
  );

  return {
    habits,
    loading,
    create,
    update,
    archive: archiveWithUndo,
    unarchive,
    pause,
    resume,
    remove,
    hardDelete,
    reorder,
  };
}
