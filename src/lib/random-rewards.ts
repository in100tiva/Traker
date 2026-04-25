/**
 * Variable-reward engine — the "drop" mechanic.
 *
 * Each habit check has a small probability of triggering a surprise reward.
 * Probability decays after a recent drop to avoid clusters and rises after
 * dry periods so users feel the engine is "fair" without becoming
 * predictable.
 *
 * Pure logic — caller passes timing context, function returns a Drop or null.
 */

export interface DropContext {
  /** Total checks since the last drop (or since install if none). */
  checksSinceLastDrop: number;
  /** Hours since the last drop. */
  hoursSinceLastDrop: number;
  /** Optional injected RNG for deterministic tests. */
  rng?: () => number;
}

export interface Drop {
  id: string;
  rarity: "common" | "rare" | "epic";
  bonusXp: number;
  message: string;
  emoji: string;
}

const COOLDOWN_HOURS = 6;
const TARGET_PER_30_CHECKS = 1; // average — eyeballed
const MAX_PROB = 0.18;

const POOL_COMMON: Drop[] = [
  {
    id: "rain",
    rarity: "common",
    bonusXp: 15,
    message: "Pequena chuva de XP — porque o esforço aparece",
    emoji: "✨",
  },
  {
    id: "extra-mile",
    rarity: "common",
    bonusXp: 20,
    message: "Bônus por consistência",
    emoji: "🌟",
  },
  {
    id: "warmup",
    rarity: "common",
    bonusXp: 10,
    message: "Aquecendo os motores",
    emoji: "🔥",
  },
];

const POOL_RARE: Drop[] = [
  {
    id: "lucky-streak",
    rarity: "rare",
    bonusXp: 50,
    message: "Drop raro: você está em ritmo de campeonato",
    emoji: "💎",
  },
  {
    id: "secret",
    rarity: "rare",
    bonusXp: 60,
    message: "Drop secreto desbloqueado",
    emoji: "🔓",
  },
];

const POOL_EPIC: Drop[] = [
  {
    id: "jackpot",
    rarity: "epic",
    bonusXp: 150,
    message: "Drop épico! Continue assim e essa vira sua identidade",
    emoji: "👑",
  },
];

function rarity(rng: () => number): Drop["rarity"] {
  const r = rng();
  if (r < 0.04) return "epic";
  if (r < 0.22) return "rare";
  return "common";
}

function pick<T>(pool: T[], rng: () => number): T {
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Decide whether a drop fires for this check. Returns the drop or null.
 */
export function maybeDrop(ctx: DropContext): Drop | null {
  const rng = ctx.rng ?? Math.random;

  if (ctx.hoursSinceLastDrop < COOLDOWN_HOURS) return null;

  // Probability rises with dry checks and plateaus at MAX_PROB.
  const linear =
    Math.min(1, ctx.checksSinceLastDrop / 30) * TARGET_PER_30_CHECKS;
  const prob = Math.min(MAX_PROB, linear * 0.18);

  if (rng() > prob) return null;

  const r = rarity(rng);
  if (r === "epic") return pick(POOL_EPIC, rng);
  if (r === "rare") return pick(POOL_RARE, rng);
  return pick(POOL_COMMON, rng);
}

/** Used by tests to confirm pool integrity. */
export const _ALL_DROPS = [...POOL_COMMON, ...POOL_RARE, ...POOL_EPIC];
