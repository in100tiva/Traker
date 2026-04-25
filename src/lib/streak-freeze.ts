/**
 * Streak freeze policy.
 *
 * - Free users: 1 freeze per local month
 * - Premium (future): 3 per local month
 *
 * The DB stores actual freezes used in `freezes` (with `month_key` as the
 * "YYYY-MM" of when it was applied). This module only computes whether the
 * user has freezes left and decides whether to apply one when a streak is
 * about to break.
 *
 * Pure functions — DB I/O lives in queries.ts (`useFreeze`, `getFreezesForMonth`).
 */

export interface FreezeQuota {
  total: number;
  used: number;
  remaining: number;
  monthKey: string;
}

export const FREE_TIER_QUOTA = 1;
export const PREMIUM_TIER_QUOTA = 3;

export function quotaFor(
  tier: "free" | "premium",
  monthKey: string,
  used: number,
): FreezeQuota {
  const total = tier === "premium" ? PREMIUM_TIER_QUOTA : FREE_TIER_QUOTA;
  return {
    total,
    used,
    remaining: Math.max(0, total - used),
    monthKey,
  };
}

/**
 * Should we offer a freeze to the user when we detect a 1-day gap that
 * would otherwise break the streak? Yes when:
 * - user has at least one remaining
 * - habit had a meaningful streak (>=3) — we don't waste freezes on tiny
 *   streaks where the freeze isn't worth the dialog
 */
export function shouldOfferFreeze(args: {
  remaining: number;
  streakBeforeGap: number;
}): boolean {
  return args.remaining > 0 && args.streakBeforeGap >= 3;
}
