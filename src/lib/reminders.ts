const LS_KEY = "traker.reminder";

export interface ReminderConfig {
  enabled: boolean;
  hour: number; // 0-23, local time
  minute: number;
}

export const defaultReminder: ReminderConfig = {
  enabled: false,
  hour: 20,
  minute: 0,
};

export function loadReminder(): ReminderConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultReminder;
    const parsed = JSON.parse(raw);
    return { ...defaultReminder, ...parsed };
  } catch {
    return defaultReminder;
  }
}

export function saveReminder(cfg: ReminderConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  return Notification.requestPermission();
}

function msUntilNext(hour: number, minute: number, now = new Date()): number {
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

const LAST_SENT_KEY = "traker.reminder.lastSent";

/**
 * Starts a client-side daily reminder timer. Fires a notification via SW at
 * the configured time while the page is open. Returns a stop function.
 */
export function startReminderTimer(
  cfg: ReminderConfig,
  getPendingCount: () => number,
): () => void {
  if (!cfg.enabled) return () => {};
  let timeoutId: number | null = null;
  let cancelled = false;

  const schedule = () => {
    if (cancelled) return;
    const delay = msUntilNext(cfg.hour, cfg.minute);
    timeoutId = window.setTimeout(async () => {
      if (cancelled) return;
      const today = new Date().toISOString().slice(0, 10);
      const lastSent = localStorage.getItem(LAST_SENT_KEY);
      if (lastSent !== today) {
        const pending = getPendingCount();
        if (pending > 0 && "serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.active?.postMessage({
            type: "notify",
            title: "Traker — lembrete",
            body:
              pending === 1
                ? "Você ainda tem 1 hábito pendente hoje."
                : `Você ainda tem ${pending} hábitos pendentes hoje.`,
          });
        }
        localStorage.setItem(LAST_SENT_KEY, today);
      }
      schedule();
    }, delay);
  };

  schedule();
  return () => {
    cancelled = true;
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  };
}
