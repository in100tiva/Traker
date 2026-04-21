import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { DbBundle } from "@/db/client";
import {
  incrementCount,
  setNote,
  toggleCompletion,
  type CompletionRecord,
  type WeeklyCount,
} from "@/db/queries";
import { lastNDays, toDateKey } from "@/lib/date";

interface CompletionRow {
  date: string;
  count: number;
  note: string | null;
}
interface WeekRow {
  week_start: string;
  count: string;
}

export function useCompletions(
  bundle: DbBundle | null,
  habitId: string | null,
  windowDays = 371,
) {
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [weekly, setWeekly] = useState<WeeklyCount[]>([]);
  const [loading, setLoading] = useState(false);

  const { from, to } = useMemo(() => {
    const days = lastNDays(new Date(), windowDays);
    return { from: days[0], to: days[days.length - 1] };
  }, [windowDays]);

  useEffect(() => {
    if (!bundle || !habitId) {
      setCompletions([]);
      setWeekly([]);
      return;
    }
    let cancelled = false;
    let unsubCompletions: (() => void) | null = null;
    let unsubWeekly: (() => void) | null = null;

    setLoading(true);

    bundle.pg.live
      .query<CompletionRow>(
        `SELECT date::text AS date, count, note FROM completions
         WHERE habit_id = $1 AND date BETWEEN $2 AND $3
         ORDER BY date ASC`,
        [habitId, from, to],
        (res) => {
          if (cancelled) return;
          setCompletions(
            res.rows.map((r) => ({
              date: r.date,
              count: r.count,
              note: r.note,
            })),
          );
          setLoading(false);
        },
      )
      .then((sub) => {
        if (cancelled) {
          sub.unsubscribe();
          return;
        }
        unsubCompletions = sub.unsubscribe;
      })
      .catch((err) => {
        console.error("[completions] live query failed", err);
        toast.error("Falha ao carregar marcações");
      });

    bundle.pg.live
      .query<WeekRow>(
        `SELECT to_char(date_trunc('week', date)::date, 'YYYY-MM-DD') AS week_start,
                count(*)::text AS count
         FROM completions
         WHERE habit_id = $1
         GROUP BY 1
         ORDER BY 1 DESC
         LIMIT 12`,
        [habitId],
        (res) => {
          if (cancelled) return;
          const mapped = res.rows
            .map((r) => ({ weekStart: r.week_start, count: Number(r.count) }))
            .reverse();
          setWeekly(mapped);
        },
      )
      .then((sub) => {
        if (cancelled) {
          sub.unsubscribe();
          return;
        }
        unsubWeekly = sub.unsubscribe;
      })
      .catch((err) => {
        console.error("[weekly] live query failed", err);
      });

    return () => {
      cancelled = true;
      unsubCompletions?.();
      unsubWeekly?.();
    };
  }, [bundle, habitId, from, to]);

  const toggle = useCallback(
    async (date: Date) => {
      if (!bundle || !habitId) return;
      try {
        await toggleCompletion(bundle.db, habitId, toDateKey(date));
      } catch (err) {
        toast.error("Falha ao atualizar marcação", {
          description: (err as Error).message,
        });
      }
    },
    [bundle, habitId],
  );

  const increment = useCallback(
    async (date: Date, delta: number) => {
      if (!bundle || !habitId) return;
      try {
        await incrementCount(bundle.db, habitId, toDateKey(date), delta);
      } catch (err) {
        toast.error("Falha ao atualizar contador", {
          description: (err as Error).message,
        });
      }
    },
    [bundle, habitId],
  );

  const updateNote = useCallback(
    async (date: Date, note: string | null) => {
      if (!bundle || !habitId) return;
      try {
        await setNote(bundle.db, habitId, toDateKey(date), note);
      } catch (err) {
        toast.error("Falha ao salvar nota", {
          description: (err as Error).message,
        });
      }
    },
    [bundle, habitId],
  );

  return { completions, weekly, loading, toggle, increment, updateNote };
}
