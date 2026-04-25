import { describe, it, expect } from "vitest";
import {
  recommendReminderTime,
  reEngagementCopyFor,
} from "@/lib/notifications-engine";
import type { AppEventLite } from "@/lib/analytics";

function event(date: Date): AppEventLite {
  return { type: "habit_check", createdAt: date.toISOString() };
}

describe("notifications-engine — recommendReminderTime", () => {
  it("returns a low-confidence default when not enough data", () => {
    const rec = recommendReminderTime([]);
    expect(rec.confidence).toBe(0);
    expect(rec.hour).toBe(20);
  });

  it("recommends one hour earlier than the modal hour", () => {
    const events: AppEventLite[] = [];
    // 10 events at 19h
    for (let i = 0; i < 10; i++) {
      const d = new Date();
      d.setHours(19, 30, 0, 0);
      events.push(event(d));
    }
    const rec = recommendReminderTime(events);
    expect(rec.hour).toBe(18);
    expect(rec.minute).toBe(45);
    expect(rec.confidence).toBeGreaterThan(0);
  });
});

describe("notifications-engine — reEngagementCopyFor", () => {
  it("returns null for users not actually away", () => {
    expect(reEngagementCopyFor(0)).toBeNull();
    expect(reEngagementCopyFor(1)).toBeNull();
  });

  it("uses different tones at different absence windows", () => {
    expect(reEngagementCopyFor(2)?.tone).toBe("gentle_nudge");
    expect(reEngagementCopyFor(5)?.tone).toBe("welcome_back");
    expect(reEngagementCopyFor(10)?.tone).toBe("we_miss_you");
    expect(reEngagementCopyFor(45)?.tone).toBe("comeback");
  });

  it("body text always exists", () => {
    for (const days of [2, 5, 10, 45]) {
      const c = reEngagementCopyFor(days);
      expect(c?.body.length).toBeGreaterThan(5);
    }
  });
});
