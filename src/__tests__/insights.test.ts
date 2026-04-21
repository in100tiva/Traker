import { describe, it, expect } from "vitest";
import { generateInsights } from "@/lib/insights";
import type { CompletionRecord, WeeklyCount } from "@/db/queries";

function makeCompletions(dates: string[]): CompletionRecord[] {
  return dates.map((d) => ({ date: d, count: 1, note: null }));
}

function makeWeekly(counts: number[]): WeeklyCount[] {
  return counts.map((count, i) => ({
    weekStart: `2026-0${i + 1}-01`,
    count,
  }));
}

describe("generateInsights", () => {
  it("returns empty-state insight when no completions", () => {
    const out = generateInsights({
      completions: [],
      weekly: [],
      targetPerWeek: 3,
      today: "2026-04-20",
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("empty");
  });

  it("reports last-30-day count when there are completions", () => {
    const out = generateInsights({
      completions: makeCompletions([
        "2026-04-01",
        "2026-04-05",
        "2026-04-10",
      ]),
      weekly: [],
      targetPerWeek: 3,
      today: "2026-04-20",
    });
    const last30 = out.find((i) => i.id === "last-30");
    expect(last30).toBeDefined();
    expect(last30!.text).toContain("3 de 30 dias");
  });

  it("surfaces the proximity to the next milestone within 5 days", () => {
    // 5 consecutive days ending today → next milestone 7, 2 days away
    const out = generateInsights({
      completions: makeCompletions([
        "2026-04-16",
        "2026-04-17",
        "2026-04-18",
        "2026-04-19",
        "2026-04-20",
      ]),
      weekly: [],
      targetPerWeek: 7,
      today: "2026-04-20",
    });
    const milestone = out.find((i) => i.id === "milestone");
    expect(milestone).toBeDefined();
    expect(milestone!.text).toContain("2 dias");
    expect(milestone!.text).toContain("7 dias");
  });

  it("warns when today is missing but yesterday was marked", () => {
    const out = generateInsights({
      completions: makeCompletions([
        "2026-04-18",
        "2026-04-19",
      ]),
      weekly: [],
      targetPerWeek: 7,
      today: "2026-04-20",
    });
    const warn = out.find((i) => i.id === "today-pending");
    expect(warn).toBeDefined();
    expect(warn!.kind).toBe("warning");
  });

  it("calls out the longest streak when it beats the current streak", () => {
    // Longest = 4 (Jan block), current streak broken by time (no recent)
    const out = generateInsights({
      completions: makeCompletions([
        "2026-01-01",
        "2026-01-02",
        "2026-01-03",
        "2026-01-04",
        "2026-03-10",
      ]),
      weekly: [],
      targetPerWeek: 3,
      today: "2026-04-20",
    });
    const longest = out.find((i) => i.id === "longest");
    expect(longest).toBeDefined();
    expect(longest!.text).toContain("4 dias");
  });

  it("reports improvement when this week beats the previous", () => {
    const out = generateInsights({
      completions: makeCompletions(["2026-04-18", "2026-04-19", "2026-04-20"]),
      weekly: makeWeekly([2, 5]),
      targetPerWeek: 3,
      today: "2026-04-20",
    });
    const trend = out.find((i) => i.id === "trend-up");
    expect(trend).toBeDefined();
    expect(trend!.kind).toBe("success");
  });

  it("reports regression when this week dropped vs. the previous (if prev>=3)", () => {
    const out = generateInsights({
      completions: makeCompletions(["2026-04-20"]),
      weekly: makeWeekly([5, 1]),
      targetPerWeek: 3,
      today: "2026-04-20",
    });
    const trend = out.find((i) => i.id === "trend-down");
    expect(trend).toBeDefined();
    expect(trend!.kind).toBe("warning");
  });

  it("caps output at 4 insights", () => {
    // Craft a scenario with many applicable insights
    const dates: string[] = [];
    for (let i = 0; i < 10; i++) dates.push(`2026-04-${String(11 + i).padStart(2, "0")}`);
    const out = generateInsights({
      completions: makeCompletions(dates),
      weekly: makeWeekly([2, 6]),
      targetPerWeek: 3,
      today: "2026-04-20",
    });
    expect(out.length).toBeLessThanOrEqual(4);
  });
});
