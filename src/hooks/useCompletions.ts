import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

interface LiveHandle {
  refresh?: () => Promise<void> | void;
  unsubscribe: () => void;
}

export function useCompletions(
  bundle: DbBundle | null,
  habitId: string | null,
  windowDays = 371,
) {
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [weekly, setWeekly] = useState<WeeklyCount[]>([]);
  const [loading, setLoading] = useState(false);

  // Handles so we can force a refresh after mutations, as a safety net on top
  // of PGlite's auto-tracked live queries.
  const completionsRef = useRef<LiveHandle | null>(null);
  const weeklyRef = useRef<LiveHandle | null>(null);

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
        completionsRef.current = sub as LiveHandle;
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
        weeklyRef.current = sub as LiveHandle;
      })
      .catch((err) => {
        console.error("[weekly] live query failed", err);
      });

    return () => {
      cancelled = true;
      completionsRef.current?.unsubscribe();
      weeklyRef.current?.unsubscribe();
      completionsRef.current = null;
      weeklyRef.current = null;
    };
  }, [bundle, habitId, from, to]);

  const refreshAll = useCallback(async () => {
    try {
      await completionsRef.current?.refresh?.();
    } catch {
      /* ignore */
    }
    try {
      await weeklyRef.current?.refresh?.();
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    async (date: Date) => {
      if (!bundle || !habitId) return;
      try {
        await toggleCompletion(bundle.db, habitId, toDateKey(date));
        await refreshAll();
      } catch (err) {
        toast.error("Falha ao atualizar marcação", {
          description: (err as Error).message,
        });
      }
    },
    [bundle, habitId, refreshAll],
  );

  const increment = useCallback(
    async (date: Date, delta: number) => {
      if (!bundle || !habitId) return;
      try {
        await incrementCount(bundle.db, habitId, toDateKey(date), delta);
        await refreshAll();
      } catch (err) {
        toast.error("Falha ao atualizar contador", {
          description: (err as Error).message,
        });
      }
    },
    [bundle, habitId, refreshAll],
  );

  const updateNote = useCallback(
    async (date: Date, note: string | null) => {
      if (!bundle || !habitId) return;
      try {
        await setNote(bundle.db, habitId, toDateKey(date), note);
        await refreshAll();
      } catch (err) {
        toast.error("Falha ao salvar nota", {
          description: (err as Error).message,
        });
      }
    },
    [bundle, habitId, refreshAll],
  );

  return { completions, weekly, loading, toggle, increment, updateNote };
}
