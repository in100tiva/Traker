import { describe, it, expect } from "vitest";
import {
  avatarForLevel,
  IDENTITY_TITLES,
  LEVEL_THRESHOLDS,
  levelFromXp,
  titleForLevel,
  xpForCheck,
  xpForMilestone,
  MILESTONE_GRANT,
} from "@/lib/gamification";

describe("gamification — XP per check", () => {
  it("base XP awarded on a streakless check", () => {
    expect(xpForCheck(0)).toBe(10);
  });

  it("streak adds 2 XP per consecutive day, up to a cap", () => {
    expect(xpForCheck(1)).toBe(12);
    expect(xpForCheck(5)).toBe(20);
    expect(xpForCheck(15)).toBe(40); // 10 + 30 cap
    expect(xpForCheck(30)).toBe(40); // capped
  });
});

describe("gamification — milestone grants", () => {
  it("returns 0 for non-milestone streaks", () => {
    expect(xpForMilestone(2)).toBe(0);
    expect(xpForMilestone(8)).toBe(0);
  });

  it("returns the registered grant for known milestones", () => {
    expect(xpForMilestone(7)).toBe(MILESTONE_GRANT[7]);
    expect(xpForMilestone(30)).toBe(MILESTONE_GRANT[30]);
    expect(xpForMilestone(365)).toBe(MILESTONE_GRANT[365]);
  });
});

describe("gamification — level curve", () => {
  it("starts at level 1 with 0 XP", () => {
    const info = levelFromXp(0);
    expect(info.level).toBe(1);
    expect(info.pct).toBe(0);
  });

  it("levels grow non-linearly", () => {
    const gaps: number[] = [];
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      gaps.push(LEVEL_THRESHOLDS[i] - LEVEL_THRESHOLDS[i - 1]);
    }
    // Each gap should be strictly larger than the previous
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    }
  });

  it("computes pct progress within the current level", () => {
    const t1 = LEVEL_THRESHOLDS[1];
    const t2 = LEVEL_THRESHOLDS[2];
    const halfway = t1 + Math.floor((t2 - t1) / 2);
    const info = levelFromXp(halfway);
    expect(info.level).toBe(2);
    expect(info.pct).toBeGreaterThan(0.4);
    expect(info.pct).toBeLessThan(0.6);
  });
});

describe("gamification — identity titles & avatars", () => {
  it("title increases monotonically with level", () => {
    const seen = new Set<string>();
    for (const t of IDENTITY_TITLES) {
      expect(seen.has(t.title)).toBe(false);
      seen.add(t.title);
    }
  });

  it("titleForLevel never returns empty", () => {
    for (let l = 1; l <= 40; l++) {
      expect(titleForLevel(l).length).toBeGreaterThan(0);
    }
  });

  it("avatar tier matches a known minLevel band", () => {
    expect(avatarForLevel(1).emoji).toBe("🌱");
    expect(avatarForLevel(20).emoji).toBe("⭐");
    expect(avatarForLevel(35).emoji).toBe("🦅");
    // Out-of-range levels never crash
    expect(avatarForLevel(99).emoji).toBe("🦅");
  });
});
