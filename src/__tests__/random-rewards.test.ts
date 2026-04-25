import { describe, it, expect } from "vitest";
import { _ALL_DROPS, maybeDrop } from "@/lib/random-rewards";

function fixedRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("random-rewards.maybeDrop", () => {
  it("returns null while inside the cooldown window", () => {
    expect(
      maybeDrop({
        checksSinceLastDrop: 0,
        hoursSinceLastDrop: 1,
        rng: fixedRng([0]),
      }),
    ).toBeNull();
  });

  it("returns null when probability check fails", () => {
    expect(
      maybeDrop({
        checksSinceLastDrop: 1,
        hoursSinceLastDrop: 24,
        rng: fixedRng([0.99]),
      }),
    ).toBeNull();
  });

  it("returns a drop when probability succeeds", () => {
    // First rng < small prob → triggers; second rng decides rarity (use 0.5 → common)
    const drop = maybeDrop({
      checksSinceLastDrop: 30,
      hoursSinceLastDrop: 24,
      rng: fixedRng([0, 0.5, 0]),
    });
    expect(drop).not.toBeNull();
    expect(drop!.rarity).toBe("common");
  });

  it("can produce epic drops on the lucky roll", () => {
    const drop = maybeDrop({
      checksSinceLastDrop: 30,
      hoursSinceLastDrop: 100,
      rng: fixedRng([0, 0.01, 0]),
    });
    expect(drop?.rarity).toBe("epic");
  });
});

describe("random-rewards pool integrity", () => {
  it("every drop has unique id and positive bonusXp", () => {
    const ids = new Set<string>();
    for (const d of _ALL_DROPS) {
      expect(ids.has(d.id)).toBe(false);
      ids.add(d.id);
      expect(d.bonusXp).toBeGreaterThan(0);
      expect(d.message.length).toBeGreaterThan(5);
    }
  });
});
