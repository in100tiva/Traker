import { describe, it, expect } from "vitest";
import { tierForStreak, FLAME_TIERS } from "@/components/StreakFlame";

describe("StreakFlame.tierForStreak", () => {
  it("returns the muted tier at zero", () => {
    expect(tierForStreak(0)).toBe(FLAME_TIERS[0]);
  });

  it("escalates color through the bands", () => {
    const t1 = tierForStreak(1);
    const t3 = tierForStreak(3);
    const t7 = tierForStreak(7);
    const t14 = tierForStreak(14);
    const t30 = tierForStreak(30);
    const t100 = tierForStreak(100);
    const t365 = tierForStreak(365);
    expect(t1.label).toBe("Acendendo");
    expect(t3.label).toBe("Pegando ritmo");
    expect(t7.label).toBe("Em chamas");
    expect(t14.label).toBe("Inabalável");
    expect(t30.label).toBe("Lendário");
    expect(t100.label).toBe("Mítico");
    expect(t365.label).toBe("Eterno");
  });

  it("colors are distinct between adjacent tiers", () => {
    const colors = FLAME_TIERS.map((t) => t.color);
    const uniq = new Set(colors);
    expect(uniq.size).toBe(colors.length);
  });
});
