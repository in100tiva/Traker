import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { toDateKey, type DateKey } from "./date";

function normalize(dates: DateKey[]): DateKey[] {
  return Array.from(new Set(dates)).sort();
}

/**
 * Counts consecutive days up to and including `today`. If `today` itself is
 * not yet marked but yesterday is, the streak continues from yesterday.
 */
export function calculateCurrentStreak(
  completedDates: DateKey[],
  today: DateKey,
): number {
  const set = new Set(completedDates);
  if (set.size === 0) return 0;

  const todayDate = parseISO(today);
  let cursor: Date;

  if (set.has(today)) {
    cursor = todayDate;
  } else {
    const yesterday = addDays(todayDate, -1);
    if (!set.has(toDateKey(yesterday))) return 0;
    cursor = yesterday;
  }

  let streak = 0;
  while (set.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest consecutive-day run in history. */
export function calculateLongestStreak(completedDates: DateKey[]): number {
  const sorted = normalize(completedDates);
  if (sorted.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = differenceInCalendarDays(
      parseISO(sorted[i]),
      parseISO(sorted[i - 1]),
    );
    if (gap === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  return longest;
}
