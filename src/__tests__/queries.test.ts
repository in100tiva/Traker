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
  getPendingToday,
  getSetting,
  getStreakHistory,
  getTotalCompletions,
  getWeekdayHistogram,
  getWeeklyCounts,
  importAll,
  incrementCount,
  listArchivedHabits,
  listHabits,
  pauseHabit,
  reorderHabits,
  resumeHabit,
  setNote,
  setSetting,
  toggleCompletion,
  unarchiveHabit,
  updateHabit,
} from "@/db/queries";
import { todayKey } from "@/lib/date";

let db: DB;

beforeEach(async () => {
  const pg = new PGlite();
  await applyMigrations(pg);
  db = drizzle(pg);
});

describe("migrations", () => {
  it("applies all migrations and is idempotent", async () => {
    const pg = new PGlite();
    const first = await applyMigrations(pg);
    expect(first.applied.length).toBeGreaterThanOrEqual(3);
    expect(first.alreadyApplied).toEqual([]);

    const second = await applyMigrations(pg);
    expect(second.applied).toEqual([]);
    expect(second.alreadyApplied).toEqual(first.applied);
  });
});

describe("habits CRUD", () => {
  it("creates habits with defaults, including new columns", async () => {
    const h = await createHabit(db, { name: "Meditar" });
    expect(h.color).toBe("#22c55e");
    expect(h.targetPerWeek).toBe(7);
    expect(h.targetPerDay).toBeNull();
    expect(h.unit).toBeNull();
    expect(h.isNegative).toBe(false);
    expect(h.tag).toBeNull();
    expect(h.sortOrder).toBeGreaterThan(0);
    expect(h.pausedAt).toBeNull();
    expect(h.archivedAt).toBeNull();
  });

  it("orders habits by sortOrder (not just createdAt)", async () => {
    const h1 = await createHabit(db, { name: "A" });
    const h2 = await createHabit(db, { name: "B" });
    const h3 = await createHabit(db, { name: "C" });

    await reorderHabits(db, [h3.id, h1.id, h2.id]);
    const rows = await listHabits(db);
    expect(rows.map((r) => r.name)).toEqual(["C", "A", "B"]);
  });

  it("updateHabit patches columns including negative/tag/unit", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await updateHabit(db, h.id, {
      name: "Ler (atualizado)",
      isNegative: true,
      tag: "saude",
      unit: "páginas",
      targetPerDay: 20,
    });
    const [row] = await listHabits(db);
    expect(row.name).toBe("Ler (atualizado)");
    expect(row.isNegative).toBe(true);
    expect(row.tag).toBe("saude");
    expect(row.unit).toBe("páginas");
    expect(row.targetPerDay).toBe(20);
  });

  it("pause/resume toggles pausedAt and filters from default list", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await pauseHabit(db, h.id);
    expect(await listHabits(db, { includePaused: false })).toHaveLength(0);
    expect(await listHabits(db, { includePaused: true })).toHaveLength(1);
    await resumeHabit(db, h.id);
    expect(await listHabits(db, { includePaused: false })).toHaveLength(1);
  });

  it("archive/unarchive cycles the habit between lists", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await archiveHabit(db, h.id);
    expect(await listHabits(db)).toHaveLength(0);
    expect(await listArchivedHabits(db)).toHaveLength(1);
    await unarchiveHabit(db, h.id);
    expect(await listHabits(db)).toHaveLength(1);
  });

  it("cascades hard-delete to completions", async () => {
    const h = await createHabit(db, { name: "Beber água" });
    await toggleCompletion(db, h.id, "2026-04-18");
    await toggleCompletion(db, h.id, "2026-04-19");
    expect(await getTotalCompletions(db, h.id)).toBe(2);

    await deleteHabit(db, h.id);
    expect(await listHabits(db)).toHaveLength(0);
  });
});

describe("toggleCompletion / incrementCount / setNote", () => {
  it("toggle creates with count=1 then deletes", async () => {
    const h = await createHabit(db, { name: "Ler" });
    expect(await toggleCompletion(db, h.id, "2026-04-20")).toBe("created");
    expect(await getTotalCompletions(db, h.id)).toBe(1);
    expect(await toggleCompletion(db, h.id, "2026-04-20")).toBe("deleted");
  });

  it("increment creates/updates/deletes based on delta", async () => {
    const h = await createHabit(db, { name: "Água" });
    expect(await incrementCount(db, h.id, "2026-04-20", 1)).toBe(1);
    expect(await incrementCount(db, h.id, "2026-04-20", 2)).toBe(3);
    expect(await incrementCount(db, h.id, "2026-04-20", -5)).toBe(0);
    expect(await getTotalCompletions(db, h.id)).toBe(0);
  });

  it("setNote attaches note; creates completion if missing", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await setNote(db, h.id, "2026-04-20", "Capítulo 3 bom");
    const rows = await getCompletionsInRange(
      db,
      h.id,
      "2026-04-01",
      "2026-04-30",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].note).toBe("Capítulo 3 bom");
    expect(rows[0].count).toBe(1);
  });

  it("setNote to empty string clears note but keeps completion", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await setNote(db, h.id, "2026-04-20", "x");
    await setNote(db, h.id, "2026-04-20", "");
    const rows = await getCompletionsInRange(
      db,
      h.id,
      "2026-04-01",
      "2026-04-30",
    );
    expect(rows[0].note).toBeNull();
  });
});

describe("getCompletionsInRange", () => {
  it("returns entries with date, count, note within range", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await toggleCompletion(db, h.id, "2026-04-18");
    await toggleCompletion(db, h.id, "2026-04-20");
    await incrementCount(db, h.id, "2026-04-20", 2);
    await setNote(db, h.id, "2026-04-20", "Foi bom");

    const rows = await getCompletionsInRange(
      db,
      h.id,
      "2026-04-17",
      "2026-04-22",
    );
    expect(rows).toEqual([
      { date: "2026-04-18", count: 1, note: null },
      { date: "2026-04-20", count: 3, note: "Foi bom" },
    ]);
  });
});

describe("getWeeklyCounts", () => {
  it("groups by ISO week Monday-based", async () => {
    const h = await createHabit(db, { name: "Ler" });
    await toggleCompletion(db, h.id, "2026-04-14");
    await toggleCompletion(db, h.id, "2026-04-16");
    await toggleCompletion(db, h.id, "2026-04-20");

    const weeks = await getWeeklyCounts(db, h.id);
    const byWeek = Object.fromEntries(
      weeks.map((w) => [w.weekStart, w.count]),
    );
    expect(byWeek["2026-04-13"]).toBe(2);
    expect(byWeek["2026-04-20"]).toBe(1);
  });
});

describe("getCompletionRate / getLastCompletion", () => {
  it("computes rate over window", async () => {
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

  it("returns the latest completion date or null", async () => {
    const h = await createHabit(db, { name: "Ler" });
    expect(await getLastCompletion(db, h.id)).toBeNull();
    await toggleCompletion(db, h.id, "2026-04-14");
    await toggleCompletion(db, h.id, "2026-04-20");
    expect(await getLastCompletion(db, h.id)).toBe("2026-04-20");
  });
});

describe("getPendingToday", () => {
  it("counts active habits minus those with a completion today", async () => {
    const today = todayKey();
    const h1 = await createHabit(db, { name: "Ler" });
    await createHabit(db, { name: "Correr" });
    const h3 = await createHabit(db, { name: "Pausado" });

    // Mark only h1 today
    await toggleCompletion(db, h1.id, today);
    // Pause h3 → should not count
    await pauseHabit(db, h3.id);

    const { pending, total } = await getPendingToday(db, today);
    expect(total).toBe(2);
    expect(pending).toBe(1);
  });
});

describe("getWeekdayHistogram", () => {
  it("buckets completions by day-of-week", async () => {
    const h = await createHabit(db, { name: "Ler" });
    // 2026-04-13 Mon(1), 2026-04-15 Wed(3), 2026-04-20 Mon(1)
    await toggleCompletion(db, h.id, "2026-04-13");
    await toggleCompletion(db, h.id, "2026-04-15");
    await toggleCompletion(db, h.id, "2026-04-20");

    const hist = await getWeekdayHistogram(db, h.id);
    expect(hist).toHaveLength(7);
    expect(hist[1].count).toBe(2); // Monday
    expect(hist[3].count).toBe(1); // Wednesday
    expect(hist[0].count).toBe(0); // Sunday
  });
});

describe("getStreakHistory", () => {
  it("returns N points with streak values", async () => {
    const h = await createHabit(db, { name: "Ler" });
    const today = todayKey();
    await toggleCompletion(db, h.id, today);

    const hist = await getStreakHistory(db, h.id, 7);
    expect(hist).toHaveLength(7);
    expect(hist[hist.length - 1].date).toBe(today);
    expect(hist[hist.length - 1].streak).toBe(1);
  });
});

describe("settings K/V", () => {
  it("round-trips a JSON value", async () => {
    await setSetting(db, "app", {
      theme: "light",
      retroactiveLimitDays: 14,
    });
    const value = await getSetting<{ theme: string }>(db, "app");
    expect(value).toEqual({ theme: "light", retroactiveLimitDays: 14 });
  });

  it("upserts on repeated writes", async () => {
    await setSetting(db, "app", { theme: "light" });
    await setSetting(db, "app", { theme: "dark" });
    const value = await getSetting<{ theme: string }>(db, "app");
    expect(value?.theme).toBe("dark");
  });

  it("returns null when key missing", async () => {
    expect(await getSetting(db, "missing")).toBeNull();
  });
});

describe("export / import round trip (v2)", () => {
  it("preserves habits (archive/pause/tag/unit), completions with notes, and settings", async () => {
    const h1 = await createHabit(db, {
      name: "Ler",
      color: "#22c55e",
      targetPerWeek: 5,
      targetPerDay: 20,
      unit: "páginas",
      tag: "aprendizado",
    });
    const h2 = await createHabit(db, {
      name: "Não fumar",
      isNegative: true,
    });
    await toggleCompletion(db, h1.id, "2026-04-18");
    await setNote(db, h1.id, "2026-04-18", "Capítulo 4");
    await toggleCompletion(db, h2.id, "2026-04-20");
    await archiveHabit(db, h2.id);
    await setSetting(db, "app", { theme: "light" });

    const payload = await exportAll(db);
    expect(payload.version).toBe(2);
    expect(payload.habits).toHaveLength(2);
    expect(payload.completions).toHaveLength(2);
    expect(payload.settings.some((s) => s.key === "app")).toBe(true);

    const pg = new PGlite();
    await applyMigrations(pg);
    const fresh = drizzle(pg);
    await importAll(fresh, payload);

    const habits = await listHabits(fresh, { includeArchived: true });
    expect(habits).toHaveLength(2);
    const ler = habits.find((h) => h.name === "Ler")!;
    expect(ler.tag).toBe("aprendizado");
    expect(ler.unit).toBe("páginas");
    expect(ler.targetPerDay).toBe(20);

    const rows = await getCompletionsInRange(
      fresh,
      ler.id,
      "2026-04-01",
      "2026-04-30",
    );
    expect(rows[0].note).toBe("Capítulo 4");

    const settingRow = await getSetting<{ theme: string }>(fresh, "app");
    expect(settingRow?.theme).toBe("light");
  });

  it("rejects unsupported version numbers", async () => {
    await expect(
      importAll(db, {
        version: 99,
        exportedAt: "",
        habits: [],
        completions: [],
        settings: [],
      }),
    ).rejects.toThrow(/Unsupported export version/);
  });
});
