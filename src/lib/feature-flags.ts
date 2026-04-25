/**
 * Lightweight feature-flag system with deterministic bucketing by install_id.
 *
 * - Flags are declared statically (typed)
 * - For each flag the user is bucketed into a variant by hashing
 *   `${install_id}:${flag_id}` mod 100 and matching bucket ranges
 * - User can override flags via the AdminDashboard (Phase 4) — the override
 *   is persisted in the `settings` KV under `feature_overrides`
 *
 * No server, no remote config. This is enough to ship parallel variations
 * locally and to compare retention against your own previous self.
 */

export type FlagId =
  | "celebration_intensity"   // off | subtle | heavy
  | "streak_break_copy"       // empathetic | direct
  | "drop_frequency"          // off | low | normal | high
  | "onboarding_steps"        // 3 | 5
  | "home_layout";            // grid | list

export interface FlagDef<V extends string> {
  id: FlagId;
  default: V;
  variants: Array<{ value: V; weight: number }>;
}

const FLAGS: Record<FlagId, FlagDef<string>> = {
  celebration_intensity: {
    id: "celebration_intensity",
    default: "subtle",
    variants: [
      { value: "off", weight: 10 },
      { value: "subtle", weight: 60 },
      { value: "heavy", weight: 30 },
    ],
  },
  streak_break_copy: {
    id: "streak_break_copy",
    default: "empathetic",
    variants: [
      { value: "empathetic", weight: 70 },
      { value: "direct", weight: 30 },
    ],
  },
  drop_frequency: {
    id: "drop_frequency",
    default: "normal",
    variants: [
      { value: "off", weight: 5 },
      { value: "low", weight: 30 },
      { value: "normal", weight: 50 },
      { value: "high", weight: 15 },
    ],
  },
  onboarding_steps: {
    id: "onboarding_steps",
    default: "3",
    variants: [
      { value: "3", weight: 70 },
      { value: "5", weight: 30 },
    ],
  },
  home_layout: {
    id: "home_layout",
    default: "grid",
    variants: [
      { value: "grid", weight: 70 },
      { value: "list", weight: 30 },
    ],
  },
};

/**
 * djb2-ish 32-bit non-cryptographic hash. Stable across reloads.
 */
function hash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Returns the variant for the given flag based on install_id.
 * Pure, given (installId, flagId, overrides).
 */
export function variantFor<V extends string = string>(
  installId: string,
  flagId: FlagId,
  overrides: Partial<Record<FlagId, string>> = {},
): V {
  const override = overrides[flagId];
  if (override) return override as V;

  const def = FLAGS[flagId];
  if (!def) throw new Error(`Unknown flag: ${flagId}`);

  const total = def.variants.reduce((s, v) => s + v.weight, 0);
  const bucket = hash(`${installId}:${flagId}`) % total;

  let acc = 0;
  for (const v of def.variants) {
    acc += v.weight;
    if (bucket < acc) return v.value as V;
  }
  return def.default as V;
}

export function listFlags(): FlagDef<string>[] {
  return Object.values(FLAGS);
}
