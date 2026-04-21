/**
 * Subtle haptic feedback via navigator.vibrate (Android/Chrome mobile).
 * No-op when unsupported or when the user prefers reduced motion.
 */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator === "undefined") return;
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

export const haptics = {
  tap: () => haptic(8),
  success: () => haptic([15, 40, 15]),
  error: () => haptic([40, 40, 40]),
};
