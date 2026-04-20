import { useCallback, useEffect, useState } from "react";
import type { DB } from "@/db/client";
import {
  getCompletionsInRange,
  getWeeklyCounts,
  toggleCompletion,
  type WeeklyCount,
} from "@/db/queries";
import { lastNDays, toDateKey, type DateKey } from "@/lib/date";

export function useCompletions(
  db: DB | null,
  habitId: string | null,
  windowDays = 371,
) {
  const [completions, setCompletions] = useState<DateKey[]>([]);
  const [weekly, setWeekly] = useState<WeeklyCount[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!db || !habitId) {
      setCompletions([]);
      setWeekly([]);
      return;
    }
    setLoading(true);
    const days = lastNDays(new Date(), windowDays);
    const [rows, weeks] = await Promise.all([
      getCompletionsInRange(db, habitId, days[0], days[days.length - 1]),
      getWeeklyCounts(db, habitId, 12),
    ]);
    setCompletions(rows);
    setWeekly(weeks);
    setLoading(false);
  }, [db, habitId, windowDays]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (date: Date) => {
      if (!db || !habitId) return;
      await toggleCompletion(db, habitId, toDateKey(date));
      await refresh();
    },
    [db, habitId, refresh],
  );

  return { completions, weekly, loading, toggle, refresh };
}
