import { and, asc, desc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type { DB } from "./client";
import { completions, habits, type Habit } from "./schema";
import type { DateKey } from "@/lib/date";

export async function listHabits(db: DB, includeArchived = false): Promise<Habit[]> {
  const query = db.select().from(habits);
  const rows = includeArchived
    ? await query.orderBy(asc(habits.createdAt))
    : await query.where(isNull(habits.archivedAt)).orderBy(asc(habits.createdAt));
  return rows;
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
    color?: string;
    targetPerWeek?: number;
  },
): Promise<Habit> {
  const [row] = await db
    .insert(habits)
    .values({
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? "#22c55e",
      targetPerWeek: input.targetPerWeek ?? 7,
    })
    .returning();
  return row;
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

export async function deleteHabit(db: DB, habitId: string): Promise<void> {
  await db.delete(habits).where(eq(habits.id, habitId));
}

export interface CompletionRecord {
  date: DateKey;
  count: number;
}

export async function getCompletionsInRange(
  db: DB,
  habitId: string,
  from: DateKey,
  to: DateKey,
): Promise<CompletionRecord[]> {
  const rows = await db
    .select({ date: completions.date, count: completions.count })
    .from(completions)
    .where(
      and(
        eq(completions.habitId, habitId),
        gte(completions.date, from),
        lte(completions.date, to),
      ),
    )
    .orderBy(asc(completions.date));
  return rows.map((r) => ({ date: r.date, count: r.count }));
}

/**
 * Toggles the completion for a given date. If absent, inserts with count=1.
 * If present, deletes (regardless of count). Use incrementCount for quantitative.
 */
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

/** Increments the count for a day (creates the row if missing). */
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

export type WeeklyCount = { weekStart: DateKey; count: number };

/** Distinct-day count per ISO week (Mon-based), most recent `weeks` buckets. */
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
  const dates = await getCompletionsInRange(db, habitId, from, to);
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const windowDays =
    Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (windowDays <= 0) return 0;
  return dates.length / windowDays;
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

export interface ExportPayload {
  version: 1;
  exportedAt: string;
  habits: Habit[];
  completions: { habitId: string; date: DateKey; count: number }[];
}

export async function exportAll(db: DB): Promise<ExportPayload> {
  const habitRows = await db.select().from(habits).orderBy(asc(habits.createdAt));
  const completionRows = await db
    .select({
      habitId: completions.habitId,
      date: completions.date,
      count: completions.count,
    })
    .from(completions)
    .orderBy(asc(completions.habitId), asc(completions.date));
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    habits: habitRows,
    completions: completionRows,
  };
}

/** Replaces all data with the payload. Throws on version mismatch. */
export async function importAll(db: DB, payload: ExportPayload): Promise<void> {
  if (payload.version !== 1) {
    throw new Error(`Unsupported export version: ${payload.version}`);
  }
  await db.delete(completions);
  await db.delete(habits);
  if (payload.habits.length > 0) {
    await db.insert(habits).values(
      payload.habits.map((h) => ({
        id: h.id,
        name: h.name,
        description: h.description,
        color: h.color,
        targetPerWeek: h.targetPerWeek,
        archivedAt: h.archivedAt ? new Date(h.archivedAt) : null,
        createdAt: new Date(h.createdAt),
      })),
    );
  }
  if (payload.completions.length > 0) {
    await db.insert(completions).values(
      payload.completions.map((c) => ({
        habitId: c.habitId,
        date: c.date,
        count: c.count,
      })),
    );
  }
}
