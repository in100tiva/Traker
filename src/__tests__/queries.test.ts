import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { applyMigrations } from "@/db/migrator";
import type { DB } from "@/db/client";
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  exportAll,
  getCompletionRate,
  getCompletionsInRange,
  getLastCompletion,
  getTotalCompletions,
  getWeeklyCounts,
  importAll,
  incrementCount,
  listArchivedHabits,
  listHabits,
  toggleCompletion,
  unarchiveHabit,
} from "@/db/queries";

let db: DB;

beforeEach(async () => {
  const pg = new PGlite();
  await applyMigrations(pg);
  db = drizzle(pg);
});

describe("migrations", () => {
  it("applies all migrations and records them in _migrations", async () => {
    const pg = new PGlite();
    const first = await applyMigrations(pg);
    expect(first.applied.length).toBeGreaterThan(0);
    expect(first.alreadyApplied).toEqual([]);

    const second = await applyMigrations(pg);
    expect(second.applied).toEqual([]);
    expect(second.alreadyApplied).toEqual(first.applied);
  });
});

describe("habits CRUD", () => {
  it("creates and lists habits (active only by default)", async () => {
    await createHabit(db, { name: "Ler", color: "#22c55e" });
    await createHabit(db, { name: "Correr", color: "#3b82f6", targetPerWeek: 3 });
    const rows = await listHabits(db);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.name)).toEqual(["Ler", "Correr"]);
    expect(rows[1].targetPerWeek).toBe(3);
  });

  it("applies defaults when fields are omitted", async () => {
    const h = await createHabit(db, { name: "Meditar" });
    expect(h.color).toBe("#22c55e");
    expect(h.targetPerWeek).toBe(7);
    expect(h.archivedAt).toBeNull();
  });

  it("archive hides habit from default list and surfaces it in archived list", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await archiveHabit(db, h.id);

    expect(await listHabits(db)).toHaveLength(0);
    expect(await listHabits(db, true)).toHaveLength(1);

    const archived = await listArchivedHabits(db);
    expect(archived).toHaveLength(1);
    expect(archived[0].archivedAt).toBeInstanceOf(Date);
  });

  it("unarchive restores a habit", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await archiveHabit(db, h.id);
    await unarchiveHabit(db, h.id);
    const rows = await listHabits(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].archivedAt).toBeNull();
  });

  it("cascades hard-delete to completions", async () => {
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

describe("incrementCount", () => {
  it("creates with delta when row missing, otherwise increments", async () => {
    const h = await createHabit(db, { name: "Água" });
    expect(await incrementCount(db, h.id, "2026-04-20", 1)).toBe(1);
    expect(await incrementCount(db, h.id, "2026-04-20", 2)).toBe(3);
    expect(await incrementCount(db, h.id, "2026-04-20", -1)).toBe(2);
  });

  it("deletes the row when count drops to zero or below", async () => {
    const h = await createHabit(db, { name: "Água" });
    await incrementCount(db, h.id, "2026-04-20", 2);
    expect(await incrementCount(db, h.id, "2026-04-20", -5)).toBe(0);
    expect(await getTotalCompletions(db, h.id)).toBe(0);
  });
});

describe("getCompletionsInRange", () => {
  it("returns entries with date and count within inclusive range", async () => {
    const h = await createHabit(db, { name: "Ler" });
    for (const d of ["2026-04-15", "2026-04-18", "2026-04-20", "2026-04-25"]) {
      await toggleCompletion(db, h.id, d);
    }
    await incrementCount(db, h.id, "2026-04-20", 2); // count becomes 3

    const rows = await getCompletionsInRange(
      db,
      h.id,
      "2026-04-18",
      "2026-04-22",
    );
    expect(rows).toEqual([
      { date: "2026-04-18", count: 1 },
      { date: "2026-04-20", count: 3 },
    ]);
  });
});

describe("getWeeklyCounts", () => {
  it("groups completions by ISO week (Monday-based)", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await toggleCompletion(db, h.id, "2026-04-14");
    await toggleCompletion(db, h.id, "2026-04-16");
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

describe("export / import round trip", () => {
  it("preserves habits (including archive state and target) and completions", async () => {
    const h1 = await createHabit(db, {
      name: "Ler",
      color: "#22c55e",
      targetPerWeek: 5,
    });
    const h2 = await createHabit(db, { name: "Correr", color: "#3b82f6" });
    await toggleCompletion(db, h1.id, "2026-04-18");
    await toggleCompletion(db, h1.id, "2026-04-19");
    await incrementCount(db, h1.id, "2026-04-19", 2); // count=3
    await toggleCompletion(db, h2.id, "2026-04-20");
    await archiveHabit(db, h2.id);

    const payload = await exportAll(db);
    expect(payload.habits).toHaveLength(2);
    expect(payload.completions).toHaveLength(3);

    // Fresh DB, import
    const pg = new PGlite();
    await applyMigrations(pg);
    const freshDb = drizzle(pg);
    await importAll(freshDb, payload);

    const habits = await listHabits(freshDb, true);
    expect(habits).toHaveLength(2);
    const ler = habits.find((h) => h.name === "Ler")!;
    expect(ler.targetPerWeek).toBe(5);
    const correr = habits.find((h) => h.name === "Correr")!;
    expect(correr.archivedAt).toBeInstanceOf(Date);

    const rows = await getCompletionsInRange(
      freshDb,
      ler.id,
      "2026-04-01",
      "2026-04-30",
    );
    expect(rows).toEqual([
      { date: "2026-04-18", count: 1 },
      { date: "2026-04-19", count: 3 },
    ]);
  });

  it("rejects payloads with a newer version", async () => {
    await expect(
      importAll(db, {
        // @ts-expect-error intentionally invalid
        version: 99,
        exportedAt: "",
        habits: [],
        completions: [],
      }),
    ).rejects.toThrow(/Unsupported export version/);
  });
});
