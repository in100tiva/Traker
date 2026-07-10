import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Feedback háptico sutil. No app nativo (Capacitor) usa o plugin Haptics —
 * navigator.vibrate tem suporte inconsistente no WebView Android. No web,
 * mantém o fallback via navigator.vibrate (Android/Chrome mobile).
 * No-op quando não suportado ou quando o usuário prefere movimento reduzido.
 */

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function vibrateWeb(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

export function haptic(pattern: number | number[] = 10): void {
  if (prefersReducedMotion()) return;
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    return;
  }
  vibrateWeb(pattern);
}

export const haptics = {
  tap: () => {
    if (prefersReducedMotion()) return;
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      return;
    }
    vibrateWeb(8);
  },
  success: () => {
    if (prefersReducedMotion()) return;
    if (Capacitor.isNativePlatform()) {
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      return;
    }
    vibrateWeb([15, 40, 15]);
  },
  error: () => {
    if (prefersReducedMotion()) return;
    if (Capacitor.isNativePlatform()) {
      Haptics.notification({ type: NotificationType.Error }).catch(() => {});
      return;
    }
    vibrateWeb([40, 40, 40]);
  },
};
