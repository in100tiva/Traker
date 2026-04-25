import { describe, it, expect } from "vitest";
import {
  buildFeed,
  derivePostsFromEvents,
  relativeTime,
} from "@/lib/community";
import type { Habit } from "@/db/schema";

function fakeHabit(over: Partial<Habit> = {}): Habit {
  return {
    id: "habit-1",
    name: "Meditar",
    description: null,
    emoji: "🧘",
    color: "#22c55e",
    targetPerWeek: 7,
    targetPerDay: null,
    unit: null,
    isNegative: false,
    tag: null,
    schedule: 127,
    sortOrder: 0,
    triggerType: null,
    triggerValue: null,
    pausedAt: null,
    archivedAt: null,
    createdAt: new Date(),
    ...over,
  } as Habit;
}

describe("community feed", () => {
  it("derives a milestone post from a streak=7 habit_check", () => {
    const habits = [fakeHabit()];
    const events = [
      {
        type: "habit_check",
        payload: { habitId: "habit-1", streak: 7 },
        createdAt: new Date().toISOString(),
      },
    ];
    const posts = derivePostsFromEvents({ habits, events });
    expect(posts).toHaveLength(1);
    expect(posts[0].tone).toBe("milestone");
    expect(posts[0].authorTag).toBe("self");
    expect(posts[0].message).toContain("7");
    expect(posts[0].message).toContain("Meditar");
  });

  it("ignores non-milestone streaks", () => {
    const habits = [fakeHabit()];
    const events = [
      {
        type: "habit_check",
        payload: { habitId: "habit-1", streak: 5 },
        createdAt: new Date().toISOString(),
      },
    ];
    const posts = derivePostsFromEvents({ habits, events });
    expect(posts).toHaveLength(0);
  });

  it("derives a drop post with rarity-aware avatar", () => {
    const habits = [fakeHabit()];
    const events = [
      {
        type: "drop_grant",
        payload: { rarity: "epic", bonusXp: 150, dropId: "abc" },
        createdAt: new Date().toISOString(),
      },
    ];
    const [post] = derivePostsFromEvents({ habits, events });
    expect(post.tone).toBe("drop");
    expect(post.avatar).toBe("👑");
    expect(post.subtitle).toContain("150");
  });

  it("derives a comeback post from freeze_used", () => {
    const habits = [fakeHabit()];
    const events = [
      {
        type: "freeze_used",
        payload: { habitId: "habit-1", brokenStreak: 14 },
        createdAt: new Date().toISOString(),
      },
    ];
    const [post] = derivePostsFromEvents({ habits, events });
    expect(post.tone).toBe("comeback");
    expect(post.subtitle).toContain("14");
    expect(post.message).toContain("Meditar");
  });

  it("derives a new_habit post from habit_create", () => {
    const events = [
      {
        type: "habit_create",
        payload: { method: "bj_fogg" },
        createdAt: new Date().toISOString(),
      },
    ];
    const [post] = derivePostsFromEvents({ habits: [], events });
    expect(post.tone).toBe("new_habit");
    expect(post.subtitle).toBe("Método guiado");
  });

  it("buildFeed sorts most recent first and includes seed posts", () => {
    const habits = [fakeHabit()];
    const justNow = new Date().toISOString();
    const events = [
      {
        type: "habit_check",
        payload: { habitId: "habit-1", streak: 30 },
        createdAt: justNow,
      },
    ];
    const feed = buildFeed({ habits, events });
    expect(feed.length).toBeGreaterThan(1);
    // Most recent first
    for (let i = 1; i < feed.length; i++) {
      expect(
        new Date(feed[i - 1].createdAt).getTime(),
      ).toBeGreaterThanOrEqual(new Date(feed[i].createdAt).getTime());
    }
    // Includes the user's own milestone at the top (it's now)
    expect(feed[0].authorTag).toBe("self");
    // Always has at least one seed friend post
    expect(feed.some((p) => p.authorTag === "friend")).toBe(true);
  });

  it("respects the limit", () => {
    const feed = buildFeed({ habits: [], events: [] }, 3);
    expect(feed.length).toBeLessThanOrEqual(3);
  });

  it("relativeTime returns pt-BR labels", () => {
    expect(relativeTime(new Date().toISOString())).toBe("agora");
    const fiveMin = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(relativeTime(fiveMin)).toMatch(/há 5 min/);
    const twoHours = new Date(Date.now() - 2 * 3_600_000).toISOString();
    expect(relativeTime(twoHours)).toMatch(/há 2 h/);
    const oneDay = new Date(Date.now() - 24 * 3_600_000).toISOString();
    expect(relativeTime(oneDay)).toBe("ontem");
    const threeDays = new Date(Date.now() - 3 * 24 * 3_600_000).toISOString();
    expect(relativeTime(threeDays)).toMatch(/há 3 d/);
  });

  it("milestones include 14, 30, 60, 100, 365 days", () => {
    const habits = [fakeHabit()];
    for (const streak of [14, 30, 60, 100, 365]) {
      const events = [
        {
          type: "habit_check",
          payload: { habitId: "habit-1", streak },
          createdAt: new Date().toISOString(),
        },
      ];
      const posts = derivePostsFromEvents({ habits, events });
      expect(posts).toHaveLength(1);
      expect(posts[0].message).toContain(String(streak));
    }
  });
});
