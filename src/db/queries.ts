import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import type { DB } from "./client";
import {
  completions,
  events,
  freezes,
  habits,
  settings,
  xpLog,
  type AppEvent,
  type Freeze,
  type Habit,
  type XpLog,
} from "./schema";
import type { DateKey } from "@/lib/date";

// -------------------------- habits CRUD --------------------------

export async function listHabits(
  db: DB,
  opts: { includeArchived?: boolean; includePaused?: boolean } = {},
): Promise<Habit[]> {
  const conditions = [] as ReturnType<typeof eq>[];
  if (!opts.includeArchived) conditions.push(isNull(habits.archivedAt) as never);
  if (!opts.includePaused) conditions.push(isNull(habits.pausedAt) as never);
  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);
  const query = db.select().from(habits);
  return where
    ? query.where(where).orderBy(asc(habits.sortOrder), asc(habits.createdAt))
    : query.orderBy(asc(habits.sortOrder), asc(habits.createdAt));
}

export async function listArchivedHabits(db: DB): Promise<Habit[]> {
  return db
    .select()
    .from(habits)
    .where(isNotNull(habits.archivedAt))
    .orderBy(desc(habits.archivedAt));
}

export async function createHabit(
  db: DB,
  input: {
    name: string;
    description?: string | null;
    emoji?: string | null;
    color?: string;
    targetPerWeek?: number;
    targetPerDay?: number | null;
    unit?: string | null;
    isNegative?: boolean;
    tag?: string | null;
    schedule?: number;
  },
): Promise<Habit> {
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(sort_order), 0)::int` })
    .from(habits);
  const [row] = await db
    .insert(habits)
    .values({
      name: input.name,
      description: input.description ?? null,
      emoji: input.emoji ?? null,
      color: input.color ?? "#22c55e",
      targetPerWeek: input.targetPerWeek ?? 7,
      targetPerDay: input.targetPerDay ?? null,
      unit: input.unit ?? null,
      isNegative: input.isNegative ?? false,
      tag: input.tag ?? null,
      schedule: input.schedule ?? 127,
      sortOrder: Number(maxOrder) + 1,
    })
    .returning();
  return row;
}

export async function updateHabit(
  db: DB,
  habitId: string,
  patch: Partial<{
    name: string;
    description: string | null;
    emoji: string | null;
    color: string;
    targetPerWeek: number;
    targetPerDay: number | null;
    unit: string | null;
    isNegative: boolean;
    tag: string | null;
    schedule: number;
  }>,
): Promise<void> {
  await db.update(habits).set(patch).where(eq(habits.id, habitId));
}

export async function archiveHabit(db: DB, habitId: string): Promise<void> {
  await db
    .update(habits)
    .set({ archivedAt: new Date() })
    .where(eq(habits.id, habitId));
}

export async function unarchiveHabit(db: DB, habitId: string): Promise<void> {
  await db
    .update(habits)
    .set({ archivedAt: null })
    .where(eq(habits.id, habitId));
}

export async function pauseHabit(db: DB, habitId: string): Promise<void> {
  await db
    .update(habits)
    .set({ pausedAt: new Date() })
    .where(eq(habits.id, habitId));
}

export async function resumeHabit(db: DB, habitId: string): Promise<void> {
  await db
    .update(habits)
    .set({ pausedAt: null })
    .where(eq(habits.id, habitId));
}

export async function deleteHabit(db: DB, habitId: string): Promise<void> {
  await db.delete(habits).where(eq(habits.id, habitId));
}

export async function reorderHabits(
  db: DB,
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(habits)
      .set({ sortOrder: i + 1 })
      .where(eq(habits.id, orderedIds[i]));
  }
}

// ----------------------- completions --------------------------

export interface CompletionRecord {
  date: DateKey;
  count: number;
  note: string | null;
}

export async function getCompletionsInRange(
  db: DB,
  habitId: string,
  from: DateKey,
  to: DateKey,
): Promise<CompletionRecord[]> {
  const rows = await db
    .select({
      date: completions.date,
      count: completions.count,
      note: completions.note,
    })
    .from(completions)
    .where(
      and(
        eq(completions.habitId, habitId),
        gte(completions.date, from),
        lte(completions.date, to),
      ),
    )
    .orderBy(asc(completions.date));
  return rows.map((r) => ({ date: r.date, count: r.count, note: r.note }));
}

export async function toggleCompletion(
  db: DB,
  habitId: string,
  date: DateKey,
): Promise<"created" | "deleted"> {
  const existing = await db
    .select({ id: completions.id })
    .from(completions)
    .where(and(eq(completions.habitId, habitId), eq(completions.date, date)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(completions).where(eq(completions.id, existing[0].id));
    return "deleted";
  }
  await db.insert(completions).values({ habitId, date, count: 1 });
  return "created";
}

export async function incrementCount(
  db: DB,
  habitId: string,
  date: DateKey,
  delta = 1,
): Promise<number> {
  const existing = await db
    .select({ id: completions.id, count: completions.count })
    .from(completions)
    .where(and(eq(completions.habitId, habitId), eq(completions.date, date)))
    .limit(1);

  if (existing.length === 0) {
    if (delta <= 0) return 0;
    await db.insert(completions).values({ habitId, date, count: delta });
    return delta;
  }
  const next = existing[0].count + delta;
  if (next <= 0) {
    await db.delete(completions).where(eq(completions.id, existing[0].id));
    return 0;
  }
  await db
    .update(completions)
    .set({ count: next })
    .where(eq(completions.id, existing[0].id));
  return next;
}

export async function setNote(
  db: DB,
  habitId: string,
  date: DateKey,
  note: string | null,
): Promise<void> {
  const existing = await db
    .select({ id: completions.id })
    .from(completions)
    .where(and(eq(completions.habitId, habitId), eq(completions.date, date)))
    .limit(1);
  if (existing.length === 0) {
    // Create with count=1 so the note has a row to attach to.
    await db
      .insert(completions)
      .values({ habitId, date, count: 1, note: note?.trim() || null });
    return;
  }
  await db
    .update(completions)
    .set({ note: note?.trim() || null })
    .where(eq(completions.id, existing[0].id));
}

// ----------------------- aggregations --------------------------

export type WeeklyCount = { weekStart: DateKey; count: number };

export async function getWeeklyCounts(
  db: DB,
  habitId: string,
  weeks = 12,
): Promise<WeeklyCount[]> {
  const result = await db.execute<{ week_start: string; count: string }>(sql`
    SELECT
      to_char(date_trunc('week', ${completions.date})::date, 'YYYY-MM-DD') AS week_start,
      count(*)::text AS count
    FROM ${completions}
    WHERE ${completions.habitId} = ${habitId}
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT ${weeks}
  `);
  const rows = (result.rows ?? result) as unknown as {
    week_start: string;
    count: string;
  }[];
  return rows
    .map((r) => ({ weekStart: r.week_start, count: Number(r.count) }))
    .reverse();
}

export async function getCompletionRate(
  db: DB,
  habitId: string,
  from: DateKey,
  to: DateKey,
): Promise<number> {
  const rows = await getCompletionsInRange(db, habitId, from, to);
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const windowDays =
    Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (windowDays <= 0) return 0;
  return rows.length / windowDays;
}

export async function getTotalCompletions(
  db: DB,
  habitId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(completions)
    .where(eq(completions.habitId, habitId));
  return Number(row?.count ?? 0);
}

export async function getLastCompletion(
  db: DB,
  habitId: string,
): Promise<DateKey | null> {
  const [row] = await db
    .select({ date: completions.date })
    .from(completions)
    .where(eq(completions.habitId, habitId))
    .orderBy(desc(completions.date))
    .limit(1);
  return row?.date ?? null;
}

/**
 * Number of active (not archived/paused) habits scheduled for `todayKey`
 * minus those already completed today.
 */
export async function getPendingToday(
  db: DB,
  todayKey: DateKey,
): Promise<{ pending: number; total: number }> {
  const dow = new Date(todayKey + "T00:00:00").getDay();
  const bit = 1 << dow;
  const result = await db.execute<{
    total: string;
    done: string;
  }>(sql`
    SELECT
      count(*)::text AS total,
      count(c.id)::text AS done
    FROM habits h
    LEFT JOIN completions c
      ON c.habit_id = h.id AND c.date = ${todayKey}
    WHERE h.archived_at IS NULL
      AND h.paused_at IS NULL
      AND (h.schedule & ${bit}) != 0
  `);
  const rows = (result.rows ?? result) as unknown as {
    total: string;
    done: string;
  }[];
  const row = rows[0] ?? { total: "0", done: "0" };
  const total = Number(row.total);
  const done = Number(row.done);
  return { total, pending: total - done };
}

/** Array of 7 entries [0..6] = [Sun..Sat] with percent completion on that dow. */
export async function getWeekdayHistogram(
  db: DB,
  habitId: string,
): Promise<{ dow: number; rate: number; count: number }[]> {
  // Compute rate = completions on dow / occurrences of dow since first completion
  const result = await db.execute<{
    dow: string;
    count: string;
  }>(sql`
    SELECT
      extract(dow from date)::text AS dow,
      count(*)::text AS count
    FROM ${completions}
    WHERE ${completions.habitId} = ${habitId}
    GROUP BY 1
    ORDER BY 1
  `);
  const rows = (result.rows ?? result) as unknown as {
    dow: string;
    count: string;
  }[];
  const buckets = new Array(7).fill(0).map((_, dow) => ({
    dow,
    count: 0,
    rate: 0,
  }));
  const [first] = await db
    .select({ d: completions.date })
    .from(completions)
    .where(eq(completions.habitId, habitId))
    .orderBy(asc(completions.date))
    .limit(1);

  const totalDays = first
    ? Math.round(
        (Date.now() - new Date(first.d).getTime()) / 86_400_000,
      ) + 1
    : 0;

  for (const r of rows) {
    const dow = Number(r.dow);
    const count = Number(r.count);
    buckets[dow].count = count;
    // Each weekday appears ~ totalDays / 7 times in the period
    const occurrences = Math.max(1, Math.round(totalDays / 7));
    buckets[dow].rate = Math.min(1, count / occurrences);
  }
  return buckets;
}

/**
 * Current-streak value at the end of each day for the last N days.
 * Used by the streak trend line chart.
 */
export async function getStreakHistory(
  db: DB,
  habitId: string,
  days = 90,
): Promise<{ date: DateKey; streak: number }[]> {
  const rows = await db
    .select({ date: completions.date })
    .from(completions)
    .where(eq(completions.habitId, habitId))
    .orderBy(asc(completions.date));
  const set = new Set(rows.map((r) => r.date));

  const out: { date: DateKey; streak: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dKey = d.toISOString().slice(0, 10);
    // Walk back from dKey while dates exist in set
    let streak = 0;
    const cursor = new Date(d);
    while (set.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    out.push({ date: dKey, streak });
  }
  return out;
}

// --------------------------- settings ---------------------------

export async function getSetting<T = unknown>(
  db: DB,
  key: string,
): Promise<T | null> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return (row?.value as T) ?? null;
}

export async function setSetting(
  db: DB,
  key: string,
  value: unknown,
): Promise<void> {
  const jsonValue = JSON.stringify(value);
  await db.execute(sql`
    INSERT INTO ${settings} (key, value, updated_at)
    VALUES (${key}, ${jsonValue}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `);
}

// ---------------------- export / import -------------------------

export interface ExportPayload {
  version: 2;
  exportedAt: string;
  habits: Habit[];
  completions: {
    habitId: string;
    date: DateKey;
    count: number;
    note: string | null;
  }[];
  settings: { key: string; value: unknown }[];
}

export async function exportAll(db: DB): Promise<ExportPayload> {
  const habitRows = await db
    .select()
    .from(habits)
    .orderBy(asc(habits.sortOrder), asc(habits.createdAt));
  const completionRows = await db
    .select({
      habitId: completions.habitId,
      date: completions.date,
      count: completions.count,
      note: completions.note,
    })
    .from(completions)
    .orderBy(asc(completions.habitId), asc(completions.date));
  const settingRows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings);
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    habits: habitRows,
    completions: completionRows,
    settings: settingRows,
  };
}

export async function importAll(
  db: DB,
  payload: ExportPayload | { version: number; [k: string]: unknown },
): Promise<void> {
  const version = (payload as { version: number }).version;
  if (version !== 1 && version !== 2) {
    throw new Error(`Unsupported export version: ${version}`);
  }
  await db.delete(completions);
  await db.delete(habits);
  await db.delete(settings);

  const p = payload as ExportPayload;
  if (p.habits?.length) {
    await db.insert(habits).values(
      p.habits.map((h: Habit, i: number) => ({
        id: h.id,
        name: h.name,
        description: h.description,
        emoji: h.emoji ?? null,
        color: h.color,
        targetPerWeek: h.targetPerWeek,
        targetPerDay: h.targetPerDay ?? null,
        unit: h.unit ?? null,
        isNegative: h.isNegative ?? false,
        tag: h.tag ?? null,
        schedule: h.schedule ?? 127,
        sortOrder: h.sortOrder ?? i + 1,
        pausedAt: h.pausedAt ? new Date(h.pausedAt) : null,
        archivedAt: h.archivedAt ? new Date(h.archivedAt) : null,
        createdAt: new Date(h.createdAt),
      })),
    );
  }
  if (p.completions?.length) {
    await db.insert(completions).values(
      p.completions.map((c) => ({
        habitId: c.habitId,
        date: c.date,
        count: c.count,
        note: c.note ?? null,
      })),
    );
  }
  if (p.settings?.length) {
    for (const s of p.settings) {
      await setSetting(db, s.key, s.value);
    }
  }
}

// =============================================================================
// PHASE 1 — Gamification, freezes, events, xp.
// =============================================================================

// ---------------------------------- XP --------------------------------------

export type XpKind =
  | "habit_check"
  | "streak_bonus"
  | "drop"
  | "milestone"
  | "freeze_grant"
  | "onboarding";

export interface RecordXpInput {
  amount: number;
  kind: XpKind;
  habitId?: string | null;
  payload?: Record<string, unknown> | null;
}

export async function recordXp(
  db: DB,
  input: RecordXpInput,
): Promise<XpLog> {
  const [row] = await db
    .insert(xpLog)
    .values({
      habitId: input.habitId ?? null,
      amount: input.amount,
      kind: input.kind,
      payload: input.payload ?? null,
    })
    .returning();
  return row;
}

export async function getXpTotal(db: DB): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(amount), 0)::int` })
    .from(xpLog);
  return Number(row?.total ?? 0);
}

export async function getRecentXp(
  db: DB,
  limit = 50,
): Promise<XpLog[]> {
  return db.select().from(xpLog).orderBy(desc(xpLog.createdAt)).limit(limit);
}

// ---------------------------------- Events ---------------------------------

export interface RecordEventInput {
  type: string;
  payload?: Record<string, unknown> | null;
}

export async function recordEvent(
  db: DB,
  input: RecordEventInput,
): Promise<AppEvent> {
  const [row] = await db
    .insert(events)
    .values({ type: input.type, payload: input.payload ?? null })
    .returning();
  return row;
}

export async function listEvents(
  db: DB,
  limit = 1000,
): Promise<AppEvent[]> {
  return db
    .select()
    .from(events)
    .orderBy(desc(events.createdAt))
    .limit(limit);
}

export async function findFirstEvent(
  db: DB,
  type: string,
): Promise<AppEvent | null> {
  const [row] = await db
    .select()
    .from(events)
    .where(eq(events.type, type))
    .orderBy(asc(events.createdAt))
    .limit(1);
  return row ?? null;
}

export async function eventsCount(db: DB, type?: string): Promise<number> {
  const query = db
    .select({ count: sql<number>`count(*)::int` })
    .from(events);
  const rows = type ? await query.where(eq(events.type, type)) : await query;
  return Number(rows[0]?.count ?? 0);
}

// ---------------------------------- Freezes ---------------------------------

export async function recordFreeze(
  db: DB,
  args: { monthKey: string; habitId?: string | null; reason?: string | null },
): Promise<Freeze> {
  const [row] = await db
    .insert(freezes)
    .values({
      monthKey: args.monthKey,
      habitId: args.habitId ?? null,
      reason: args.reason ?? null,
    })
    .returning();
  return row;
}

export async function freezesUsedInMonth(
  db: DB,
  monthKey: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(freezes)
    .where(eq(freezes.monthKey, monthKey));
  return Number(row?.count ?? 0);
}

export async function listFreezes(db: DB, limit = 50): Promise<Freeze[]> {
  return db
    .select()
    .from(freezes)
    .orderBy(desc(freezes.usedAt))
    .limit(limit);
}
