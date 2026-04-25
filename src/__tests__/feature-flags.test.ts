import { describe, it, expect } from "vitest";
import { listFlags, variantFor } from "@/lib/feature-flags";

describe("feature-flags", () => {
  it("returns the same variant for the same install_id", () => {
    const id = "install-stable-id";
    const a = variantFor(id, "celebration_intensity");
    const b = variantFor(id, "celebration_intensity");
    expect(a).toBe(b);
  });

  it("respects overrides", () => {
    const v = variantFor("anything", "celebration_intensity", {
      celebration_intensity: "off",
    });
    expect(v).toBe("off");
  });

  it("distributes variants across many install_ids roughly per weight", () => {
    const counts: Record<string, number> = { off: 0, subtle: 0, heavy: 0 };
    for (let i = 0; i < 1000; i++) {
      const v = variantFor(
        `installer-${i}`,
        "celebration_intensity",
      );
      counts[v] = (counts[v] ?? 0) + 1;
    }
    // weights: off=10, subtle=60, heavy=30 → tolerate ±35% jitter
    expect(counts.subtle).toBeGreaterThan(400);
    expect(counts.heavy).toBeGreaterThan(150);
    expect(counts.off).toBeGreaterThan(40);
  });

  it("listFlags exposes every declared flag", () => {
    const flags = listFlags();
    expect(flags.length).toBeGreaterThanOrEqual(5);
    for (const f of flags) {
      expect(f.id).toBeTruthy();
      expect(f.variants.length).toBeGreaterThan(0);
    }
  });
});
