/**
 * Gamification engine: XP, levels, multipliers, identity titles.
 *
 * All functions are pure. The only state lives in `xp_log` (DB) which is
 * summed by `getXpTotal` in queries.ts. UI components compute level/title
 * from a total at render time, never from a cache.
 */

export const BASE_XP_PER_HABIT = 10;
export const STREAK_BONUS_STEP = 2; // +2 XP per consecutive day, capped
export const MAX_STREAK_BONUS = 30; // bonus stops growing after 15 days
export const MILESTONE_GRANT: Record<number, number> = {
  3: 25,
  7: 75,
  14: 150,
  30: 400,
  60: 900,
  100: 1800,
  180: 3600,
  365: 8000,
  730: 20000,
};

/**
 * XP awarded for marking a habit. Streak length means a small linearly
 * increasing bonus, so power users earn more without dwarfing newcomers.
 */
export function xpForCheck(streakBefore: number): number {
  const streakBonus = Math.min(MAX_STREAK_BONUS, streakBefore * STREAK_BONUS_STEP);
  return BASE_XP_PER_HABIT + streakBonus;
}

/**
 * XP granted when a milestone is reached for the first time. Returns 0 if
 * the value isn't a known milestone.
 */
export function xpForMilestone(streak: number): number {
  return MILESTONE_GRANT[streak] ?? 0;
}

// ---------------------------------------------------------------------------
// Levels — non-linear curve. Each level needs ~1.4× the previous gap.
// L1 starts at 0 XP. Cumulative thresholds are precomputed up to L40.
// ---------------------------------------------------------------------------

const BASE_GAP = 100;
const GROWTH = 1.4;

function buildLevelTable(maxLevel: number = 40): number[] {
  const out: number[] = [0];
  let gap = BASE_GAP;
  for (let lvl = 2; lvl <= maxLevel; lvl++) {
    out.push(Math.round(out[lvl - 2] + gap));
    gap = gap * GROWTH;
  }
  return out;
}

export const LEVEL_THRESHOLDS = buildLevelTable();

export interface LevelInfo {
  level: number;
  xpInto: number;
  xpForNext: number;
  pct: number; // 0..1 progress in the current level
  totalXp: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const currentBase = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextBase =
    LEVEL_THRESHOLDS[level] ??
    LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + BASE_GAP * GROWTH ** level;
  const xpInto = Math.max(0, totalXp - currentBase);
  const xpForNext = Math.max(1, nextBase - currentBase);
  const pct = Math.max(0, Math.min(1, xpInto / xpForNext));
  return { level, xpInto, xpForNext, pct, totalXp };
}

// ---------------------------------------------------------------------------
// Identity titles — reinforce who the user is becoming, not what they do.
// ---------------------------------------------------------------------------

export const IDENTITY_TITLES: Array<{ minLevel: number; title: string }> = [
  { minLevel: 1, title: "Aprendiz" },
  { minLevel: 3, title: "Iniciante" },
  { minLevel: 5, title: "Em construção" },
  { minLevel: 8, title: "Constante" },
  { minLevel: 12, title: "Disciplinado" },
  { minLevel: 16, title: "Mente Calma" },
  { minLevel: 20, title: "Maratonista" },
  { minLevel: 25, title: "Forjado" },
  { minLevel: 30, title: "Mestre dos Hábitos" },
  { minLevel: 35, title: "Lenda Viva" },
];

export function titleForLevel(level: number): string {
  let chosen = IDENTITY_TITLES[0].title;
  for (const t of IDENTITY_TITLES) {
    if (level >= t.minLevel) chosen = t.title;
  }
  return chosen;
}

// ---------------------------------------------------------------------------
// Avatar tiers — visual evolution mapped to identity titles.
//
// Each tier picks one of three DiceBear styles to convey progression:
//   thumbs            → abstract beginner energy
//   loreleiNeutral    → character emerges (mid-tiers)
//   notionistsNeutral → refined identity (high-tiers)
// `seed` is fixed per tier so every user at level N sees the same mascot,
// reinforcing tier recognition across the community feed.
// `emoji` is kept as a textual fallback for non-avatar surfaces (toasts).
// ---------------------------------------------------------------------------

export type AvatarStyleName = "thumbs" | "loreleiNeutral" | "notionistsNeutral";

export interface AvatarTier {
  minLevel: number;
  emoji: string;
  color: string; // hex
  style: AvatarStyleName;
  seed: string;
}

export const AVATAR_TIERS: AvatarTier[] = [
  {
    minLevel: 1,
    emoji: "🌱",
    color: "#a3e635",
    style: "thumbs",
    seed: "tier-1-aprendiz",
  },
  {
    minLevel: 3,
    emoji: "🌿",
    color: "#65a30d",
    style: "thumbs",
    seed: "tier-2-iniciante",
  },
  {
    minLevel: 5,
    emoji: "🌳",
    color: "#22c55e",
    style: "loreleiNeutral",
    seed: "tier-3-construcao",
  },
  {
    minLevel: 8,
    emoji: "🌲",
    color: "#16a34a",
    style: "loreleiNeutral",
    seed: "tier-4-constante",
  },
  {
    minLevel: 12,
    emoji: "🏔️",
    color: "#0ea5e9",
    style: "loreleiNeutral",
    seed: "tier-5-disciplinado",
  },
  {
    minLevel: 16,
    emoji: "⛰️",
    color: "#3b82f6",
    style: "notionistsNeutral",
    seed: "tier-6-mente-calma",
  },
  {
    minLevel: 20,
    emoji: "⭐",
    color: "#e8ff3a",
    style: "notionistsNeutral",
    seed: "tier-7-maratonista",
  },
  {
    minLevel: 25,
    emoji: "🌟",
    color: "#f59e0b",
    style: "notionistsNeutral",
    seed: "tier-8-forjado",
  },
  {
    minLevel: 30,
    emoji: "🔥",
    color: "#f97316",
    style: "notionistsNeutral",
    seed: "tier-9-mestre",
  },
  {
    minLevel: 35,
    emoji: "🦅",
    color: "#a855f7",
    style: "notionistsNeutral",
    seed: "tier-10-lenda-viva",
  },
];

export function avatarForLevel(level: number): AvatarTier {
  let chosen = AVATAR_TIERS[0];
  for (const t of AVATAR_TIERS) {
    if (level >= t.minLevel) chosen = t;
  }
  return chosen;
}

/**
 * Returns the next tier the user has not reached yet, or `null` if already at
 * the top. Used by the IdentityProfileDialog to preview what's coming.
 */
export function nextAvatarTier(level: number): AvatarTier | null {
  for (const t of AVATAR_TIERS) {
    if (t.minLevel > level) return t;
  }
  return null;
}

/**
 * Returns the title associated with the next tier (mirrors `titleForLevel`).
 */
export function nextTitleForLevel(level: number): string | null {
  for (const t of IDENTITY_TITLES) {
    if (t.minLevel > level) return t.title;
  }
  return null;
}
