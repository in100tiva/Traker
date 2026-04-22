/**
 * Schedule: 7-bit bitmask indicating which days of the week a habit is
 * scheduled for. Bit i corresponds to dayOfWeek i where 0 = Sunday ... 6 = Saturday
 * (matching JavaScript's Date.prototype.getDay()).
 *
 * Example values:
 *   127 = 0b1111111 = every day (default)
 *    42 = 0b0101010 = Mon, Wed, Fri
 *   124 = 0b1111100 = weekdays (Mon–Fri)
 *    65 = 0b1000001 = weekends (Sat, Sun)
 */

export const ALL_DAYS_SCHEDULE = 0b1111111; // 127

export const WEEKDAY_SHORT_LABELS = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

export const WEEKDAY_LETTER_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

export const WEEKDAY_FULL_LABELS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

export function isScheduledOnDow(schedule: number, dow: number): boolean {
  return (schedule & (1 << dow)) !== 0;
}

export function isScheduledOn(schedule: number, date: Date): boolean {
  return isScheduledOnDow(schedule, date.getDay());
}

export function countScheduledDays(schedule: number): number {
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (schedule & (1 << i)) count += 1;
  }
  return count;
}

export function setDowInSchedule(
  schedule: number,
  dow: number,
  on: boolean,
): number {
  const mask = 1 << dow;
  return on ? schedule | mask : schedule & ~mask;
}

export function toggleDowInSchedule(schedule: number, dow: number): number {
  return schedule ^ (1 << dow);
}

/**
 * Human-friendly label. Returns "Todos os dias" for the full schedule,
 * compact lists otherwise.
 */
export function scheduleLabel(schedule: number): string {
  if (schedule === ALL_DAYS_SCHEDULE) return "Todos os dias";
  // Weekdays only
  if (schedule === 0b0111110) return "Seg a Sex";
  // Weekend only
  if (schedule === 0b1000001) return "Sábado e domingo";

  const parts: string[] = [];
  for (let i = 0; i < 7; i++) {
    if (schedule & (1 << i)) parts.push(WEEKDAY_SHORT_LABELS[i]);
  }
  return parts.join(", ");
}

/** List of dowNumbers that are in the schedule. */
export function scheduledDows(schedule: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 7; i++) {
    if (schedule & (1 << i)) out.push(i);
  }
  return out;
}

export function nextScheduledDay(from: Date, schedule: number): Date {
  if (schedule === 0) {
    throw new Error("Schedule empty");
  }
  let cursor = new Date(from);
  for (let i = 0; i < 8; i++) {
    cursor.setDate(cursor.getDate() + 1);
    if (isScheduledOn(schedule, cursor)) return cursor;
  }
  // unreachable
  return cursor;
}

export function prevScheduledDay(from: Date, schedule: number): Date {
  if (schedule === 0) {
    throw new Error("Schedule empty");
  }
  let cursor = new Date(from);
  for (let i = 0; i < 8; i++) {
    cursor.setDate(cursor.getDate() - 1);
    if (isScheduledOn(schedule, cursor)) return cursor;
  }
  return cursor;
}

/** Latest scheduled day ≤ from. */
export function latestScheduledDayAtOrBefore(
  from: Date,
  schedule: number,
): Date {
  if (isScheduledOn(schedule, from)) return new Date(from);
  return prevScheduledDay(from, schedule);
}
