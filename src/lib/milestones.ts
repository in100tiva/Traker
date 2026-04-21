import confetti from "canvas-confetti";
import { toast } from "sonner";
import { MILESTONES, newlyReachedMilestone } from "./streak";

const FIRED_KEY = "traker.milestones.fired";

interface FiredMap {
  [habitId: string]: number[];
}

function loadFired(): FiredMap {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveFired(m: FiredMap) {
  localStorage.setItem(FIRED_KEY, JSON.stringify(m));
}

export function celebrateMilestone(milestone: number, habitName: string) {
  toast.success(`🎉 Marco atingido: ${milestone} dias em "${habitName}"!`, {
    duration: 6000,
  });
  // Two confetti bursts from both sides
  const end = Date.now() + 1000;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
  (function frame() {
    confetti({ ...defaults, particleCount: 20, origin: { x: 0, y: 0.8 } });
    confetti({ ...defaults, particleCount: 20, origin: { x: 1, y: 0.8 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/**
 * Detects and celebrates milestone crossing since last check. Uses localStorage
 * to avoid re-firing on re-renders or reloads.
 */
export function checkAndCelebrateMilestone(
  habitId: string,
  habitName: string,
  currentStreak: number,
): void {
  const fired = loadFired();
  const prevFired = fired[habitId] ?? [];
  const hit = newlyReachedMilestone(
    Math.max(0, ...prevFired),
    currentStreak,
  );
  if (hit !== null && !prevFired.includes(hit)) {
    celebrateMilestone(hit, habitName);
    fired[habitId] = [...prevFired, hit].sort((a, b) => a - b);
    saveFired(fired);
  }
  // Reset tracking if streak dropped back below the lowest milestone
  if (currentStreak < MILESTONES[0] && prevFired.length > 0) {
    fired[habitId] = [];
    saveFired(fired);
  }
}
