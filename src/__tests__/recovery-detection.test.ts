import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { applyMigrations } from "@/db/migrator";
import type { DB } from "@/db/client";
import {
  createHabit,
  freezesUsedInMonth,
  recordFreeze,
  toggleCompletion,
} from "@/db/queries";
import { calculateCurrentStreak } from "@/lib/streak";
import { ALL_DAYS_SCHEDULE } from "@/lib/schedule";
import { quotaFor } from "@/lib/streak-freeze";
import { monthKey } from "@/lib/timezone";
import { toDateKey } from "@/lib/date";

let db: DB;

beforeEach(async () => {
  const pg = new PGlite();
  await applyMigrations(pg);
  db = drizzle(pg);
});

describe("recovery flow integration", () => {
  it("detects a streak break + freeze restores it", async () => {
    const habit = await createHabit(db, { name: "Ler" });

    // Build a 5-day streak ending two days ago
    const today = new Date();
    const dates: string[] = [];
    for (let i = 6; i >= 2; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = toDateKey(d);
      dates.push(k);
      await toggleCompletion(db, habit.id, k);
    }

    // Compute the broken streak as of 2 days ago
    const beforeYesterday = new Date(today);
    beforeYesterday.setDate(today.getDate() - 2);
    const broken = calculateCurrentStreak(
      dates,
      toDateKey(beforeYesterday),
      ALL_DAYS_SCHEDULE,
    );
    expect(broken).toBe(5);

    // Apply a freeze
    await recordFreeze(db, {
      monthKey: monthKey(),
      habitId: habit.id,
      reason: "streak_break",
    });

    // Mark yesterday as the result of using the freeze
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    await toggleCompletion(db, habit.id, toDateKey(yesterday));

    // The freeze counts toward this month's quota
    const used = await freezesUsedInMonth(db, monthKey());
    expect(used).toBe(1);

    const quota = quotaFor("free", monthKey(), used);
    expect(quota.remaining).toBe(0);
  });

  it("does not offer a freeze with no remaining quota", () => {
    const q = quotaFor("free", monthKey(), 1);
    expect(q.remaining).toBe(0);
  });
});
