import { useEffect, useState } from "react";
import type { DbBundle } from "@/db/client";
import { fromDateKey, todayKey } from "@/lib/date";

const SQL = `SELECT
     count(*)::int AS total,
     count(c.id)::int AS done
   FROM habits h
   LEFT JOIN completions c
     ON c.habit_id = h.id AND c.date = $1
   WHERE h.archived_at IS NULL
     AND h.paused_at IS NULL
     AND (h.schedule & $2) != 0`;

export function usePendingToday(bundle: DbBundle | null) {
  const [state, setState] = useState<{ pending: number; total: number }>({
    pending: 0,
    total: 0,
  });

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let pollId: number | null = null;

    const today = todayKey();
    const dow = fromDateKey(today).getDay();
    const bit = 1 << dow;

    const fetchOnce = async () => {
      try {
        const { rows } = await bundle.pg.query<{
          total: number;
          done: number;
        }>(SQL, [today, bit]);
        if (cancelled) return;
        const row = rows[0] ?? { total: 0, done: 0 };
        const total = Number(row.total);
        const done = Number(row.done);
        setState({ total, pending: total - done });
      } catch (err) {
        console.error("[usePendingToday] fetch failed", err);
      }
    };

    bundle.pg.live
      .query<{ total: number; done: number }>(SQL, [today, bit], (res) => {
        if (cancelled) return;
        const row = res.rows[0] ?? { total: 0, done: 0 };
        const total = Number(row.total);
        const done = Number(row.done);
        setState({ total, pending: total - done });
      })
      .then((sub) => {
        if (cancelled) {
          sub.unsubscribe();
          return;
        }
        unsubscribe = sub.unsubscribe;
      });

    // Safety net: re-poll every 5s in case live query misses updates.
    // Cheap (single aggregate query on a tiny local DB).
    pollId = window.setInterval(fetchOnce, 5000);

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (pollId !== null) window.clearInterval(pollId);
    };
  }, [bundle]);

  return state;
}
