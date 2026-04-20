import {
  format,
  parseISO,
  differenceInCalendarDays,
  startOfDay,
  addDays,
  startOfWeek,
} from "date-fns";

export type DateKey = string; // "YYYY-MM-DD"

export function toDateKey(date: Date): DateKey {
  return format(startOfDay(date), "yyyy-MM-dd");
}

export function fromDateKey(key: DateKey): Date {
  return parseISO(key);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function daysBetween(a: DateKey, b: DateKey): number {
  return differenceInCalendarDays(parseISO(a), parseISO(b));
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
