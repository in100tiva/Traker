import { describe, it, expect } from "vitest";
import {
  FREE_TIER_QUOTA,
  PREMIUM_TIER_QUOTA,
  quotaFor,
  shouldOfferFreeze,
} from "@/lib/streak-freeze";

describe("streak-freeze quota", () => {
  it("free tier gives 1 freeze per month", () => {
    const q = quotaFor("free", "2026-04", 0);
    expect(q.total).toBe(FREE_TIER_QUOTA);
    expect(q.remaining).toBe(1);
  });

  it("premium tier gives 3 freezes per month", () => {
    const q = quotaFor("premium", "2026-04", 0);
    expect(q.total).toBe(PREMIUM_TIER_QUOTA);
  });

  it("usage decrements remaining and never goes negative", () => {
    const q1 = quotaFor("free", "2026-04", 1);
    expect(q1.remaining).toBe(0);
    const q2 = quotaFor("free", "2026-04", 5);
    expect(q2.remaining).toBe(0);
  });
});

describe("shouldOfferFreeze policy", () => {
  it("offers when there are remaining freezes and streak >= 3", () => {
    expect(shouldOfferFreeze({ remaining: 1, streakBeforeGap: 5 })).toBe(true);
    expect(shouldOfferFreeze({ remaining: 1, streakBeforeGap: 3 })).toBe(true);
  });

  it("does not offer when streak < 3", () => {
    expect(shouldOfferFreeze({ remaining: 1, streakBeforeGap: 2 })).toBe(false);
  });

  it("does not offer when remaining is 0", () => {
    expect(shouldOfferFreeze({ remaining: 0, streakBeforeGap: 30 })).toBe(false);
  });
});
