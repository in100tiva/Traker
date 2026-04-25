import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { applyMigrations } from "@/db/migrator";
import type { DB } from "@/db/client";
import {
  createHabit,
  eventsCount,
  findFirstEvent,
  freezesUsedInMonth,
  getRecentXp,
  getXpTotal,
  listEvents,
  recordEvent,
  recordFreeze,
  recordXp,
} from "@/db/queries";

let db: DB;

beforeEach(async () => {
  const pg = new PGlite();
  await applyMigrations(pg);
  db = drizzle(pg);
});

describe("xp_log", () => {
  it("records and sums XP across multiple kinds", async () => {
    const habit = await createHabit(db, { name: "Ler" });
    await recordXp(db, { amount: 10, kind: "habit_check", habitId: habit.id });
    await recordXp(db, { amount: 25, kind: "drop", habitId: habit.id });
    await recordXp(db, { amount: 75, kind: "milestone", payload: { streak: 7 } });
    expect(await getXpTotal(db)).toBe(110);
  });

  it("returns most recent XP first", async () => {
    await recordXp(db, { amount: 5, kind: "habit_check" });
    await recordXp(db, { amount: 10, kind: "drop" });
    const recent = await getRecentXp(db, 10);
    expect(recent[0].kind).toBe("drop");
    expect(recent[1].kind).toBe("habit_check");
  });
});

describe("events", () => {
  it("records and counts events by type", async () => {
    await recordEvent(db, { type: "install" });
    await recordEvent(db, { type: "habit_check" });
    await recordEvent(db, { type: "habit_check" });
    expect(await eventsCount(db, "habit_check")).toBe(2);
    expect(await eventsCount(db, "install")).toBe(1);
    expect(await eventsCount(db)).toBe(3);
  });

  it("findFirstEvent returns the earliest of a given type", async () => {
    await recordEvent(db, { type: "habit_check" });
    await new Promise((r) => setTimeout(r, 10));
    await recordEvent(db, { type: "install" });
    await recordEvent(db, { type: "habit_check" });
    const first = await findFirstEvent(db, "habit_check");
    expect(first).not.toBeNull();
  });

  it("listEvents returns rows in descending creation order", async () => {
    await recordEvent(db, { type: "a" });
    await new Promise((r) => setTimeout(r, 10));
    await recordEvent(db, { type: "b" });
    const list = await listEvents(db, 10);
    expect(list[0].type).toBe("b");
    expect(list[1].type).toBe("a");
  });
});

describe("freezes", () => {
  it("records and counts freezes per month", async () => {
    await recordFreeze(db, { monthKey: "2026-04", reason: "trip" });
    await recordFreeze(db, { monthKey: "2026-04" });
    await recordFreeze(db, { monthKey: "2026-05" });
    expect(await freezesUsedInMonth(db, "2026-04")).toBe(2);
    expect(await freezesUsedInMonth(db, "2026-05")).toBe(1);
    expect(await freezesUsedInMonth(db, "2026-06")).toBe(0);
  });
});
