import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { toDateKey, type DateKey } from "./date";

function normalize(dates: DateKey[]): DateKey[] {
  return Array.from(new Set(dates)).sort();
}

/**
 * Consecutive-day streak ending at (or just before) `today`.
 * If `today` is not marked but yesterday is, the streak continues from
 * yesterday (grace window).
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

// ---------------- Weekly-goal streak ----------------

function isoWeekKey(date: Date): string {
  // Use Monday-based ISO week bucket
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * Number of consecutive weeks (ending this week) where the habit hit its
 * target_per_week goal. If the current week hasn't hit goal yet but last week
 * did, the streak keeps going — grace until end of week.
 */
export function calculateWeeklyGoalStreak(
  completedDates: DateKey[],
  targetPerWeek: number,
  today: DateKey,
): number {
  if (targetPerWeek <= 0) return 0;
  const counts = new Map<string, number>();
  for (const d of new Set(completedDates)) {
    const wk = isoWeekKey(parseISO(d));
    counts.set(wk, (counts.get(wk) ?? 0) + 1);
  }

  const todayDate = parseISO(today);
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

/**
 * Returns the milestone value if `streak` just matched one (vs. previous streak).
 * Otherwise null. Used to fire confetti + toast once per threshold crossing.
 */
export function newlyReachedMilestone(
  prevStreak: number,
  streak: number,
): number | null {
  for (const m of MILESTONES) {
    if (prevStreak < m && streak >= m) return m;
  }
  return null;
}
