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

const COMPLETIONS_SQL = `SELECT date::text AS date, count, note FROM completions
   WHERE habit_id = $1 AND date BETWEEN $2 AND $3
   ORDER BY date ASC`;

const WEEKLY_SQL = `SELECT to_char(date_trunc('week', date)::date, 'YYYY-MM-DD') AS week_start,
          count(*)::text AS count
   FROM completions
   WHERE habit_id = $1
   GROUP BY 1
   ORDER BY 1 DESC
   LIMIT 12`;

function mapCompletions(rows: CompletionRow[]): CompletionRecord[] {
  return rows.map((r) => ({
    date: r.date,
    count: r.count,
    note: r.note,
  }));
}

function mapWeekly(rows: WeekRow[]): WeeklyCount[] {
  return rows
    .map((r) => ({ weekStart: r.week_start, count: Number(r.count) }))
    .reverse();
}

export function useCompletions(
  bundle: DbBundle | null,
  habitId: string | null,
  windowDays = 371,
) {
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [weekly, setWeekly] = useState<WeeklyCount[]>([]);
  const [loading, setLoading] = useState(false);

  // Keep refs to active params so the manual refresh uses the same args
  // that the live subscription is watching.
  const paramsRef = useRef<{
    habitId: string | null;
    from: string;
    to: string;
  }>({ habitId: null, from: "", to: "" });

  const { from, to } = useMemo(() => {
    const days = lastNDays(new Date(), windowDays);
    return { from: days[0], to: days[days.length - 1] };
  }, [windowDays]);

  useEffect(() => {
    paramsRef.current = { habitId, from, to };
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
      .query<CompletionRow>(COMPLETIONS_SQL, [habitId, from, to], (res) => {
        if (cancelled) return;
        setCompletions(mapCompletions(res.rows));
        setLoading(false);
      })
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
      .query<WeekRow>(WEEKLY_SQL, [habitId], (res) => {
        if (cancelled) return;
        setWeekly(mapWeekly(res.rows));
      })
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

  /**
   * Re-fetch completions + weekly and commit to state immediately.
   * Used as a safety net on top of the PGlite live queries — in practice
   * the live queries don't always propagate on PGlite 0.2.x when writes
   * come from the Drizzle pglite driver, so we force a fresh read after
   * every mutation.
   */
  const refreshAll = useCallback(async () => {
    if (!bundle) return;
    const {
      habitId: hid,
      from: f,
      to: t,
    } = paramsRef.current;
    if (!hid) return;
    try {
      const [completionsRes, weeklyRes] = await Promise.all([
        bundle.pg.query<CompletionRow>(COMPLETIONS_SQL, [hid, f, t]),
        bundle.pg.query<WeekRow>(WEEKLY_SQL, [hid]),
      ]);
      setCompletions(mapCompletions(completionsRes.rows));
      setWeekly(mapWeekly(weeklyRes.rows));
    } catch (err) {
      console.error("[completions] manual refresh failed", err);
    }
  }, [bundle]);

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
