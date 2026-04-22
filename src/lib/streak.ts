import { addDays, differenceInCalendarDays } from "date-fns";
import { fromDateKey, toDateKey, type DateKey } from "./date";
import {
  ALL_DAYS_SCHEDULE,
  isScheduledOn,
  latestScheduledDayAtOrBefore,
  prevScheduledDay,
} from "./schedule";

function normalize(dates: DateKey[]): DateKey[] {
  return Array.from(new Set(dates)).sort();
}

/**
 * Consecutive-scheduled-day streak ending at (or just before) `today`.
 * If `today` is a scheduled day but not yet marked, the streak continues
 * from the previous scheduled day (grace window until end of day).
 *
 * When `schedule` is the full mask (127 = every day), this behaves like
 * the classic daily streak. When schedule is e.g. Mon/Wed/Fri, a missing
 * Tuesday doesn't break the streak.
 */
export function calculateCurrentStreak(
  completedDates: DateKey[],
  today: DateKey,
  schedule: number = ALL_DAYS_SCHEDULE,
): number {
  if (schedule === 0) return 0;
  const set = new Set(completedDates);
  if (set.size === 0) return 0;

  const todayDate = fromDateKey(today);

  // Move cursor to the latest scheduled day ≤ today.
  let cursor = latestScheduledDayAtOrBefore(todayDate, schedule);

  // Grace: if cursor === today and not marked, try the previous scheduled day
  if (toDateKey(cursor) === today && !set.has(today)) {
    cursor = prevScheduledDay(cursor, schedule);
    if (!set.has(toDateKey(cursor))) return 0;
  }

  let streak = 0;
  while (set.has(toDateKey(cursor))) {
    streak += 1;
    cursor = prevScheduledDay(cursor, schedule);
  }
  return streak;
}

/**
 * Longest run of consecutive scheduled-days that were all marked.
 * For schedule=127 it coincides with the classic calendar-day streak.
 */
export function calculateLongestStreak(
  completedDates: DateKey[],
  schedule: number = ALL_DAYS_SCHEDULE,
): number {
  if (schedule === 0) return 0;
  const sorted = normalize(completedDates).filter((d) =>
    isScheduledOn(schedule, fromDateKey(d)),
  );
  if (sorted.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = fromDateKey(sorted[i - 1]);
    const currDate = fromDateKey(sorted[i]);
    if (schedule === ALL_DAYS_SCHEDULE) {
      const gap = differenceInCalendarDays(currDate, prevDate);
      if (gap === 1) {
        current += 1;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    } else {
      // Consecutive scheduled days?
      let cursor = new Date(prevDate);
      cursor.setDate(cursor.getDate() + 1);
      while (!isScheduledOn(schedule, cursor)) {
        cursor.setDate(cursor.getDate() + 1);
      }
      if (toDateKey(cursor) === sorted[i]) {
        current += 1;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }
  }
  return longest;
}

// ---------------- Weekly-goal streak ----------------

function isoWeekKey(date: Date): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return toDateKey(d);
}

/**
 * Number of consecutive weeks (ending this week) where the habit hit its
 * target_per_week goal. Grace: if this week is still below goal but last
 * week hit it, the streak holds.
 */
export function calculateWeeklyGoalStreak(
  completedDates: DateKey[],
  targetPerWeek: number,
  today: DateKey,
): number {
  if (targetPerWeek <= 0) return 0;
  const counts = new Map<string, number>();
  for (const d of new Set(completedDates)) {
    const wk = isoWeekKey(fromDateKey(d));
    counts.set(wk, (counts.get(wk) ?? 0) + 1);
  }

  const todayDate = fromDateKey(today);
  const thisWk = isoWeekKey(todayDate);
  const thisHit = (counts.get(thisWk) ?? 0) >= targetPerWeek;

  let cursor: Date;
  if (thisHit) {
    cursor = todayDate;
  } else {
    cursor = addDays(todayDate, -7);
    if ((counts.get(isoWeekKey(cursor)) ?? 0) < targetPerWeek) return 0;
  }

  let streak = 0;
  while ((counts.get(isoWeekKey(cursor)) ?? 0) >= targetPerWeek) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

// ---------------- Milestones ----------------

export const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365, 730] as const;

export function newlyReachedMilestone(
  prevStreak: number,
  streak: number,
): number | null {
  for (const m of MILESTONES) {
    if (prevStreak < m && streak >= m) return m;
  }
  return null;
}
