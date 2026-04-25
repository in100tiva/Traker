/**
 * Lightweight in-app analytics. Pure aggregations over `events` rows.
 *
 * The `events` table is append-only; queries.ts has `recordEvent(type, payload)`.
 * Here we only do the math, so the same code can run on a snapshot for
 * tests and on live data in the AdminDashboard (Phase 4).
 */

export interface AppEventLite {
  type: string;
  createdAt: Date | string;
  payload?: unknown;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toMs(d: Date | string): number {
  return typeof d === "string" ? new Date(d).getTime() : d.getTime();
}

// ---------------------------------------------------------------------------
// Activation: time from install to first habit_check
// ---------------------------------------------------------------------------

export interface ActivationStats {
  installedAt: Date | null;
  activatedAt: Date | null;
  hoursToActivation: number | null;
  isActivated: boolean;
}

export function activationStats(events: AppEventLite[]): ActivationStats {
  const install = events.find((e) => e.type === "install");
  const firstCheck = events.find((e) => e.type === "habit_check");
  const installedAt = install ? new Date(toMs(install.createdAt)) : null;
  const activatedAt = firstCheck ? new Date(toMs(firstCheck.createdAt)) : null;
  const hoursToActivation =
    installedAt && activatedAt
      ? Math.round(
          (activatedAt.getTime() - installedAt.getTime()) / (1000 * 60 * 60),
        )
      : null;
  return {
    installedAt,
    activatedAt,
    hoursToActivation,
    isActivated: !!activatedAt,
  };
}

// ---------------------------------------------------------------------------
// Retention buckets: D1 / D7 / D30
// We say a user is retained at Dn if they have any event on or after the
// install day + n. (Standard cohort definition.)
// ---------------------------------------------------------------------------

export interface RetentionStats {
  d1: boolean;
  d7: boolean;
  d30: boolean;
  daysActive: number;
}

export function retentionStats(events: AppEventLite[]): RetentionStats {
  const install = events.find((e) => e.type === "install");
  if (!install) {
    return { d1: false, d7: false, d30: false, daysActive: 0 };
  }
  const installMs = toMs(install.createdAt);
  const days = new Set<string>();
  let d1 = false;
  let d7 = false;
  let d30 = false;
  for (const e of events) {
    const ms = toMs(e.createdAt);
    const dayDiff = Math.floor((ms - installMs) / DAY_MS);
    if (dayDiff >= 1) d1 = true;
    if (dayDiff >= 7) d7 = true;
    if (dayDiff >= 30) d30 = true;
    days.add(new Date(ms).toISOString().slice(0, 10));
  }
  return { d1, d7, d30, daysActive: days.size };
}

// ---------------------------------------------------------------------------
// Churn signal: days since the last event
// ---------------------------------------------------------------------------

export function daysSinceLastEvent(
  events: AppEventLite[],
  now: Date = new Date(),
): number | null {
  if (events.length === 0) return null;
  let latest = 0;
  for (const e of events) {
    const ms = toMs(e.createdAt);
    if (ms > latest) latest = ms;
  }
  return Math.floor((now.getTime() - latest) / DAY_MS);
}

export type ChurnRisk = "active" | "at_risk" | "dormant" | "churned";

export function churnRiskFromDays(days: number | null): ChurnRisk {
  if (days === null) return "churned";
  if (days <= 1) return "active";
  if (days <= 6) return "at_risk";
  if (days <= 29) return "dormant";
  return "churned";
}

// ---------------------------------------------------------------------------
// Frequency: events grouped by hour of local day. Used by notifications-engine.
// ---------------------------------------------------------------------------

export function eventsByHour(
  events: AppEventLite[],
  filterType?: string,
): number[] {
  const buckets = new Array(24).fill(0) as number[];
  for (const e of events) {
    if (filterType && e.type !== filterType) continue;
    const d = new Date(toMs(e.createdAt));
    buckets[d.getHours()] += 1;
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Top abandoned habits — those with most history but no activity in N days
// ---------------------------------------------------------------------------

export interface AbandonedHabit {
  habitId: string;
  totalChecks: number;
  daysSinceLastCheck: number;
}

export function abandonedHabits(
  events: AppEventLite[],
  windowDays = 14,
  now: Date = new Date(),
): AbandonedHabit[] {
  const byHabit = new Map<string, { count: number; lastMs: number }>();
  for (const e of events) {
    if (e.type !== "habit_check") continue;
    const id = (e.payload as { habitId?: string } | undefined)?.habitId;
    if (!id) continue;
    const entry = byHabit.get(id) ?? { count: 0, lastMs: 0 };
    entry.count += 1;
    const ms = toMs(e.createdAt);
    if (ms > entry.lastMs) entry.lastMs = ms;
    byHabit.set(id, entry);
  }
  const out: AbandonedHabit[] = [];
  for (const [id, v] of byHabit) {
    const days = Math.floor((now.getTime() - v.lastMs) / DAY_MS);
    if (days >= windowDays) {
      out.push({ habitId: id, totalChecks: v.count, daysSinceLastCheck: days });
    }
  }
  return out.sort((a, b) => b.totalChecks - a.totalChecks);
}
