import { describe, it, expect } from "vitest";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateWeeklyGoalStreak,
  newlyReachedMilestone,
} from "@/lib/streak";

describe("calculateCurrentStreak", () => {
  it("returns 0 for empty history", () => {
    expect(calculateCurrentStreak([], "2026-04-20")).toBe(0);
  });

  it("returns 1 when only today is marked", () => {
    expect(calculateCurrentStreak(["2026-04-20"], "2026-04-20")).toBe(1);
  });

  it("counts consecutive days up to today", () => {
    expect(
      calculateCurrentStreak(
        ["2026-04-18", "2026-04-19", "2026-04-20"],
        "2026-04-20",
      ),
    ).toBe(3);
  });

  it("gives grace: today missing but yesterday marked → streak from yesterday", () => {
    expect(
      calculateCurrentStreak(["2026-04-18", "2026-04-19"], "2026-04-20"),
    ).toBe(2);
  });

  it("returns 0 if yesterday also missing (streak broken)", () => {
    expect(
      calculateCurrentStreak(
        ["2026-04-15", "2026-04-16", "2026-04-17"],
        "2026-04-20",
      ),
    ).toBe(0);
  });

  it("handles gaps: stops at the first missing day before today", () => {
    expect(
      calculateCurrentStreak(
        ["2026-04-10", "2026-04-18", "2026-04-19", "2026-04-20"],
        "2026-04-20",
      ),
    ).toBe(3);
  });

  it("handles unordered input", () => {
    expect(
      calculateCurrentStreak(
        ["2026-04-20", "2026-04-18", "2026-04-19"],
        "2026-04-20",
      ),
    ).toBe(3);
  });

  it("handles duplicate dates", () => {
    expect(
      calculateCurrentStreak(
        ["2026-04-20", "2026-04-20", "2026-04-19"],
        "2026-04-20",
      ),
    ).toBe(2);
  });
});

describe("calculateLongestStreak", () => {
  it("returns 0 for empty history", () => {
    expect(calculateLongestStreak([])).toBe(0);
  });

  it("returns 1 for a single day", () => {
    expect(calculateLongestStreak(["2026-01-01"])).toBe(1);
  });

  it("returns the longest of multiple runs", () => {
    const dates = [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-10",
      "2026-01-11",
      "2026-02-01",
      "2026-02-02",
      "2026-02-03",
      "2026-02-04",
      "2026-02-05",
    ];
    expect(calculateLongestStreak(dates)).toBe(5);
  });

  it("ignores duplicates", () => {
    expect(
      calculateLongestStreak([
        "2026-01-01",
        "2026-01-01",
        "2026-01-02",
        "2026-01-03",
      ]),
    ).toBe(3);
  });

  it("handles unordered input", () => {
    expect(
      calculateLongestStreak([
        "2026-02-03",
        "2026-02-01",
        "2026-02-02",
        "2026-01-01",
      ]),
    ).toBe(3);
  });

  it("handles month boundaries", () => {
    expect(
      calculateLongestStreak([
        "2026-01-30",
        "2026-01-31",
        "2026-02-01",
        "2026-02-02",
      ]),
    ).toBe(4);
  });
});

describe("calculateWeeklyGoalStreak", () => {
  // 2026-04-20 is a Monday → week bucket "2026-04-20"
  // 2026-04-13 Mon, 2026-04-06 Mon, 2026-03-30 Mon, ...
  it("returns 0 when no completions", () => {
    expect(calculateWeeklyGoalStreak([], 3, "2026-04-20")).toBe(0);
  });

  it("returns 1 when current week hits goal", () => {
    const dates = ["2026-04-20", "2026-04-22", "2026-04-24"]; // 3 in week of Apr 20
    expect(calculateWeeklyGoalStreak(dates, 3, "2026-04-20")).toBe(1);
  });

  it("counts consecutive weeks hitting goal", () => {
    const dates = [
      "2026-04-06", "2026-04-07", "2026-04-08", // week of Apr 6: 3
      "2026-04-13", "2026-04-14", "2026-04-15", // week of Apr 13: 3
      "2026-04-20", "2026-04-21", "2026-04-22", // week of Apr 20: 3
    ];
    expect(calculateWeeklyGoalStreak(dates, 3, "2026-04-20")).toBe(3);
  });

  it("grace: current week not yet at goal but previous week hit", () => {
    const dates = [
      "2026-04-13", "2026-04-14", "2026-04-15",
      "2026-04-20", // only 1 this week
    ];
    expect(calculateWeeklyGoalStreak(dates, 3, "2026-04-20")).toBe(1);
  });

  it("breaks when a middle week misses the goal", () => {
    const dates = [
      "2026-04-06", "2026-04-07", "2026-04-08", // hits
      "2026-04-13", "2026-04-14",                // misses (goal=3)
      "2026-04-20", "2026-04-21", "2026-04-22", // hits
    ];
    expect(calculateWeeklyGoalStreak(dates, 3, "2026-04-20")).toBe(1);
  });

  it("target=7 behaves like 'every day'", () => {
    const dates = ["2026-04-20", "2026-04-21", "2026-04-22"];
    // Goal is 7/week but we only have 3 → current streak of weeks = 0
    expect(calculateWeeklyGoalStreak(dates, 7, "2026-04-20")).toBe(0);
  });
});

describe("newlyReachedMilestone", () => {
  it("returns milestone when crossing threshold", () => {
    expect(newlyReachedMilestone(6, 7)).toBe(7);
    expect(newlyReachedMilestone(0, 3)).toBe(3);
    expect(newlyReachedMilestone(29, 30)).toBe(30);
  });

  it("returns null when not crossing", () => {
    expect(newlyReachedMilestone(7, 8)).toBeNull();
    expect(newlyReachedMilestone(31, 40)).toBeNull();
  });

  it("returns null when decreasing", () => {
    expect(newlyReachedMilestone(10, 5)).toBeNull();
  });
});
