import {
  format,
  differenceInCalendarDays,
  startOfDay,
  addDays,
  startOfWeek,
} from "date-fns";

export type DateKey = string; // "YYYY-MM-DD"

export function toDateKey(date: Date): DateKey {
  return format(startOfDay(date), "yyyy-MM-dd");
}

/**
 * Parse a "YYYY-MM-DD" key as a Date in the LOCAL timezone at midnight.
 *
 * Do NOT use date-fns' parseISO for date-only strings: the spec says
 * date-only ISO strings are parsed as UTC, which causes the weekday to
 * shift by one for clients west of UTC. This helper forces local time.
 */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return differenceInCalendarDays(fromDateKey(a), fromDateKey(b));
}

/** Last N days inclusive of `end`, oldest first. */
export function lastNDays(end: Date, n: number): DateKey[] {
  const out: DateKey[] = [];
  const start = addDays(startOfDay(end), -(n - 1));
  for (let i = 0; i < n; i++) {
    out.push(toDateKey(addDays(start, i)));
  }
  return out;
}

/** ISO week start (Monday). */
export function weekStartKey(date: Date): DateKey {
  return toDateKey(startOfWeek(date, { weekStartsOn: 1 }));
}
