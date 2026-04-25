/**
 * Timezone-aware date helpers. Centralizes all "what day is it for the user"
 * logic so the rest of the app doesn't have to think about UTC vs local.
 *
 * We trust the browser's reported timezone via Intl. The user's effective
 * timezone is also persisted in settings so backend logic (Phase 4 admin)
 * can interpret events the same way the user did when generating them.
 */

import { fromDateKey, toDateKey, type DateKey } from "./date";

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** "YYYY-MM" key for the local month. Useful for monthly quotas (freezes). */
export function monthKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Yesterday's local date as DateKey. */
export function yesterdayKey(now: Date = new Date()): DateKey {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

/**
 * Returns true if `key` is today, yesterday, or anywhere within the
 * retroactive window. Used to decide whether the user can still mark a day
 * "late" without it counting as a break.
 */
export function isWithinGraceWindow(
  key: DateKey,
  windowDays = 1,
  now: Date = new Date(),
): boolean {
  const today = toDateKey(now);
  if (key === today) return true;
  const target = fromDateKey(key);
  const diff = Math.round(
    (now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff >= 0 && diff <= windowDays;
}

/** Hour-of-day (0..23) of a Date in the user's local time. */
export function hourOfDay(d: Date): number {
  return d.getHours();
}

/** Bucket a Date into a 30-min slot index (0..47). Used by notifications. */
export function halfHourSlot(d: Date): number {
  return d.getHours() * 2 + (d.getMinutes() >= 30 ? 1 : 0);
}
