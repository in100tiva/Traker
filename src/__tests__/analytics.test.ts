import { describe, it, expect } from "vitest";
import {
  abandonedHabits,
  activationStats,
  churnRiskFromDays,
  daysSinceLastEvent,
  eventsByHour,
  retentionStats,
  type AppEventLite,
} from "@/lib/analytics";

const DAY = 24 * 60 * 60 * 1000;

function ev(type: string, daysAgo: number, payload?: unknown): AppEventLite {
  return {
    type,
    createdAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
    payload,
  };
}

describe("analytics — activationStats", () => {
  it("returns inactive when there is no install event", () => {
    const stats = activationStats([]);
    expect(stats.isActivated).toBe(false);
    expect(stats.installedAt).toBeNull();
    expect(stats.activatedAt).toBeNull();
  });

  it("computes hours from install to first habit_check", () => {
    const installAt = new Date(Date.now() - 2 * DAY).toISOString();
    const checkAt = new Date(
      new Date(installAt).getTime() + 5 * 60 * 60 * 1000,
    ).toISOString();
    const stats = activationStats([
      { type: "install", createdAt: installAt },
      { type: "habit_check", createdAt: checkAt },
    ]);
    expect(stats.isActivated).toBe(true);
    expect(stats.hoursToActivation).toBe(5);
  });
});

describe("analytics — retentionStats", () => {
  it("flags D1, D7, D30 once events are old enough", () => {
    const events: AppEventLite[] = [
      ev("install", 30),
      ev("habit_check", 28),
      ev("habit_check", 23),
      ev("habit_check", 0),
    ];
    const stats = retentionStats(events);
    expect(stats.d1).toBe(true);
    expect(stats.d7).toBe(true);
    expect(stats.d30).toBe(true);
    expect(stats.daysActive).toBe(4);
  });

  it("returns false flags without an install event", () => {
    const stats = retentionStats([ev("habit_check", 1)]);
    expect(stats.d1).toBe(false);
  });
});

describe("analytics — daysSinceLastEvent + churnRisk", () => {
  it("returns null for empty event list", () => {
    expect(daysSinceLastEvent([])).toBeNull();
  });

  it("buckets days into active/at_risk/dormant/churned", () => {
    expect(churnRiskFromDays(null)).toBe("churned");
    expect(churnRiskFromDays(0)).toBe("active");
    expect(churnRiskFromDays(3)).toBe("at_risk");
    expect(churnRiskFromDays(15)).toBe("dormant");
    expect(churnRiskFromDays(60)).toBe("churned");
  });
});

describe("analytics — eventsByHour & abandonedHabits", () => {
  it("buckets events by hour-of-day", () => {
    const now = new Date();
    const events: AppEventLite[] = [
      { type: "habit_check", createdAt: new Date(now).toISOString() },
      { type: "habit_check", createdAt: new Date(now).toISOString() },
      { type: "screen_view", createdAt: new Date(now).toISOString() },
    ];
    const buckets = eventsByHour(events, "habit_check");
    const total = buckets.reduce((s, n) => s + n, 0);
    expect(total).toBe(2);
  });

  it("flags habits without recent activity as abandoned", () => {
    const events: AppEventLite[] = [
      { type: "habit_check", createdAt: ev("x", 30).createdAt, payload: { habitId: "a" } },
      { type: "habit_check", createdAt: ev("x", 25).createdAt, payload: { habitId: "a" } },
      { type: "habit_check", createdAt: ev("x", 1).createdAt, payload: { habitId: "b" } },
    ];
    const out = abandonedHabits(events, 14);
    expect(out.length).toBe(1);
    expect(out[0].habitId).toBe("a");
    expect(out[0].totalChecks).toBe(2);
  });
});
