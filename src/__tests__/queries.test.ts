import { describe, it, expect, beforeEach } from "vitest";
import { createDb, type DB } from "@/db/client";
import {
  createHabit,
  deleteHabit,
  getCompletionRate,
  getCompletionsInRange,
  getLastCompletion,
  getTotalCompletions,
  getWeeklyCounts,
  listHabits,
  toggleCompletion,
} from "@/db/queries";

let db: DB;

beforeEach(async () => {
  db = await createDb(); // in-memory
});

describe("habits CRUD", () => {
  it("creates and lists habits", async () => {
    await createHabit(db, { name: "Ler", color: "#22c55e" });
    await createHabit(db, { name: "Correr", color: "#3b82f6" });
    const rows = await listHabits(db);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.name)).toEqual(["Ler", "Correr"]);
  });

  it("applies default color when omitted", async () => {
    const h = await createHabit(db, { name: "Meditar" });
    expect(h.color).toBe("#22c55e");
  });

  it("cascades deletion to completions", async () => {
    const h = await createHabit(db, { name: "Beber água" });
    await toggleCompletion(db, h.id, "2026-04-18");
    await toggleCompletion(db, h.id, "2026-04-19");
    expect(await getTotalCompletions(db, h.id)).toBe(2);

    await deleteHabit(db, h.id);
    const rows = await listHabits(db);
    expect(rows).toHaveLength(0);
  });
});

describe("toggleCompletion", () => {
  it("creates then deletes a completion (idempotent toggle)", async () => {
    const h = await createHabit(db, { name: "Ler" });

    const first = await toggleCompletion(db, h.id, "2026-04-20");
    expect(first).toBe("created");
    expect(await getTotalCompletions(db, h.id)).toBe(1);

    const second = await toggleCompletion(db, h.id, "2026-04-20");
    expect(second).toBe("deleted");
    expect(await getTotalCompletions(db, h.id)).toBe(0);
  });
});

describe("getCompletionsInRange", () => {
  it("returns only dates within the inclusive range", async () => {
    const h = await createHabit(db, { name: "Ler" });
    for (const d of ["2026-04-15", "2026-04-18", "2026-04-20", "2026-04-25"]) {
      await toggleCompletion(db, h.id, d);
    }
    const dates = await getCompletionsInRange(
      db,
      h.id,
      "2026-04-18",
      "2026-04-22",
    );
    expect(dates).toEqual(["2026-04-18", "2026-04-20"]);
  });
});

describe("getWeeklyCounts", () => {
  it("groups completions by ISO week (Monday-based)", async () => {
    const h = await createHabit(db, { name: "Ler" });
    // Week of 2026-04-13 (Mon): two marks
    await toggleCompletion(db, h.id, "2026-04-14");
    await toggleCompletion(db, h.id, "2026-04-16");
    // Week of 2026-04-20 (Mon): three marks
    await toggleCompletion(db, h.id, "2026-04-20");
    await toggleCompletion(db, h.id, "2026-04-22");
    await toggleCompletion(db, h.id, "2026-04-24");

    const weeks = await getWeeklyCounts(db, h.id, 12);
    const byWeek = Object.fromEntries(weeks.map((w) => [w.weekStart, w.count]));
    expect(byWeek["2026-04-13"]).toBe(2);
    expect(byWeek["2026-04-20"]).toBe(3);
  });
});

describe("getCompletionRate", () => {
  it("returns completions / days in window", async () => {
    const h = await createHabit(db, { name: "Ler" });
    for (const d of ["2026-04-14", "2026-04-16", "2026-04-20"]) {
      await toggleCompletion(db, h.id, d);
    }
    // 7-day window: 14..20 inclusive → 3/7
    const rate = await getCompletionRate(
      db,
      h.id,
      "2026-04-14",
      "2026-04-20",
    );
    expect(rate).toBeCloseTo(3 / 7, 5);
  });
});

describe("getLastCompletion", () => {
  it("returns the most recent date", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await toggleCompletion(db, h.id, "2026-04-14");
    await toggleCompletion(db, h.id, "2026-04-20");
    await toggleCompletion(db, h.id, "2026-04-16");
    expect(await getLastCompletion(db, h.id)).toBe("2026-04-20");
  });

  it("returns null when no completions", async () => {
    const h = await createHabit(db, { name: "Ler" });
    expect(await getLastCompletion(db, h.id)).toBeNull();
  });
});
