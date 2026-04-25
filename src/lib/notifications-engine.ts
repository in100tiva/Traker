/**
 * Smart-notification engine.
 *
 * Goal: instead of asking the user to pick a fixed time, learn from their
 * own behavior. Pull the last N `habit_check` events out of the events log,
 * histogram them by hour, and pick the modal hour as the "ideal" reminder
 * time. Offer this as a suggestion in the Reminders UI.
 *
 * Pure: takes events, returns a recommendation. The settings layer applies
 * it via `setSetting('reminder', { hour, minute, enabled })`.
 */

import type { AppEventLite } from "./analytics";

export interface ReminderRecommendation {
  /** Suggested local hour (0..23). */
  hour: number;
  /** Optional minute (defaults to 0). */
  minute: number;
  /** Confidence 0..1 — how much data the suggestion is based on. */
  confidence: number;
  /** Hours histogram (24 buckets) used to derive the suggestion. */
  histogram: number[];
}

const MIN_DATA_POINTS = 5;

export function recommendReminderTime(
  events: AppEventLite[],
  filterType = "habit_check",
): ReminderRecommendation {
  const histogram = new Array(24).fill(0) as number[];
  let total = 0;
  for (const e of events) {
    if (e.type !== filterType) continue;
    const d = new Date(typeof e.createdAt === "string" ? e.createdAt : e.createdAt.getTime());
    histogram[d.getHours()] += 1;
    total += 1;
  }

  if (total < MIN_DATA_POINTS) {
    return {
      hour: 20,
      minute: 0,
      confidence: 0,
      histogram,
    };
  }

  // Pick the modal hour, then bias slightly earlier (15min before peak)
  // — the goal is to remind *before* the user usually opens the app.
  let bestHour = 20;
  let bestCount = -1;
  for (let h = 0; h < 24; h++) {
    if (histogram[h] > bestCount) {
      bestCount = histogram[h];
      bestHour = h;
    }
  }
  const recommendedHour = (bestHour - 1 + 24) % 24;
  return {
    hour: recommendedHour,
    minute: 45,
    confidence: Math.min(1, total / 30),
    histogram,
  };
}

// ---------------------------------------------------------------------------
// Re-engagement strategy: pick a copy variant for the in-app banner based on
// how long the user has been away.
// ---------------------------------------------------------------------------

export interface ReEngagementCopy {
  tone: "welcome_back" | "we_miss_you" | "comeback" | "gentle_nudge";
  title: string;
  body: string;
}

export function reEngagementCopyFor(daysAway: number): ReEngagementCopy | null {
  if (daysAway < 2) return null;
  if (daysAway <= 3) {
    return {
      tone: "gentle_nudge",
      title: "Bom te ver de volta",
      body: "Que tal um check rápido pra esquentar a sequência?",
    };
  }
  if (daysAway <= 7) {
    return {
      tone: "welcome_back",
      title: "Sentimos sua falta 💛",
      body: "Voltar agora vale mais que começar amanhã.",
    };
  }
  if (daysAway <= 14) {
    return {
      tone: "we_miss_you",
      title: "Comeback é parte do jogo",
      body: "Quem retoma em até 2 semanas mantém 60% mais tempo.",
    };
  }
  return {
    tone: "comeback",
    title: "Recomeço sem culpa",
    body: "Você não perdeu nada — só está prestes a recomeçar.",
  };
}
