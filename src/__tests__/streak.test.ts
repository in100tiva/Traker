import { describe, it, expect } from "vitest";
import {
  calculateCurrentStreak,
  calculateLongestStreak,
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
      calculateCurrentStreak(
        ["2026-04-18", "2026-04-19"],
        "2026-04-20",
      ),
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
