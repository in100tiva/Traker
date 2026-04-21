import { useEffect, useState } from "react";
import type { DbBundle } from "@/db/client";
import { todayKey } from "@/lib/date";

export function usePendingToday(bundle: DbBundle | null) {
  const [state, setState] = useState<{ pending: number; total: number }>({
    pending: 0,
    total: 0,
  });

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const today = todayKey();
    bundle.pg.live
      .query<{ total: number; done: number }>(
        `SELECT
           count(*)::int AS total,
           count(c.id)::int AS done
         FROM habits h
         LEFT JOIN completions c
           ON c.habit_id = h.id AND c.date = $1
         WHERE h.archived_at IS NULL AND h.paused_at IS NULL`,
        [today],
        (res) => {
          if (cancelled) return;
          const row = res.rows[0] ?? { total: 0, done: 0 };
          const total = Number(row.total);
          const done = Number(row.done);
          setState({ total, pending: total - done });
        },
      )
      .then((sub) => {
        if (cancelled) {
          sub.unsubscribe();
          return;
        }
        unsubscribe = sub.unsubscribe;
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [bundle]);

  return state;
}
