import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { DB } from "./client";
import { completions, habits, type Habit } from "./schema";
import type { DateKey } from "@/lib/date";

export async function listHabits(db: DB): Promise<Habit[]> {
  return db.select().from(habits).orderBy(asc(habits.createdAt));
}

export async function createHabit(
  db: DB,
  input: { name: string; description?: string | null; color?: string },
): Promise<Habit> {
  const [row] = await db
    .insert(habits)
    .values({
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? "#22c55e",
    })
    .returning();
  return row;
}

export async function deleteHabit(db: DB, habitId: string): Promise<void> {
  await db.delete(habits).where(eq(habits.id, habitId));
}

export async function getCompletionsInRange(
  db: DB,
  habitId: string,
  from: DateKey,
  to: DateKey,
): Promise<DateKey[]> {
  const rows = await db
    .select({ date: completions.date })
    .from(completions)
    .where(
      and(
        eq(completions.habitId, habitId),
        gte(completions.date, from),
        lte(completions.date, to),
      ),
    )
    .orderBy(asc(completions.date));
  return rows.map((r) => r.date);
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
  await db.insert(completions).values({ habitId, date });
  return "created";
}

export type WeeklyCount = { weekStart: DateKey; count: number };

/** Number of completions per ISO week (Mon-based), most recent `weeks` buckets. */
export async function getWeeklyCounts(
  db: DB,
  habitId: string,
  weeks = 12,
): Promise<WeeklyCount[]> {
  const rows = await db.execute<{ week_start: string; count: string }>(sql`
    SELECT
      to_char(date_trunc('week', ${completions.date})::date, 'YYYY-MM-DD') AS week_start,
      count(*)::text AS count
    FROM ${completions}
    WHERE ${completions.habitId} = ${habitId}
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT ${weeks}
  `);
  return (rows.rows as unknown as { week_start: string; count: string }[])
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
