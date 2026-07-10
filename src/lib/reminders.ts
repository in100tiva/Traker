import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const LS_KEY = "traker.reminder";

/** Id fixo da notificação de lembrete diário (nativo). */
const REMINDER_NOTIFICATION_ID = 1;

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

export function isNativeReminders(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * No app nativo (Capacitor) os lembretes usam LocalNotifications — o WebView
 * Android não expõe window.Notification. No web, exige a Notification API.
 */
export function notificationsSupported(): boolean {
  if (isNativeReminders()) return true;
  return typeof window !== "undefined" && "Notification" in window;
}

function mapNativePermission(
  state: "granted" | "denied" | "prompt" | "prompt-with-rationale",
): NotificationPermission {
  if (state === "granted") return "granted";
  if (state === "denied") return "denied";
  return "default";
}

/** Permissão atual, sem prompt (nativo: checkPermissions; web: Notification.permission). */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (isNativeReminders()) {
    const { display } = await LocalNotifications.checkPermissions();
    return mapNativePermission(display);
  }
  if (!notificationsSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isNativeReminders()) {
    // No Android 13+ o plugin cuida do prompt POST_NOTIFICATIONS.
    const { display } = await LocalNotifications.requestPermissions();
    return mapNativePermission(display);
  }
  if (!notificationsSupported()) return "denied";
  return Notification.requestPermission();
}

/**
 * Agenda (ou reagenda) o lembrete diário nativo. Dispara via AlarmManager no
 * horário configurado, mesmo com o app fechado — sem depender de aba aberta.
 */
export async function scheduleNativeReminder(cfg: ReminderConfig): Promise<void> {
  if (!isNativeReminders()) return;
  await cancelNativeReminder();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_NOTIFICATION_ID,
        title: "Streaks — lembrete",
        body: "Passa aqui pra marcar seus hábitos de hoje.",
        schedule: {
          on: { hour: cfg.hour, minute: cfg.minute },
          allowWhileIdle: true,
        },
      },
    ],
  });
}

export async function cancelNativeReminder(): Promise<void> {
  if (!isNativeReminders()) return;
  await LocalNotifications.cancel({
    notifications: [{ id: REMINDER_NOTIFICATION_ID }],
  });
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
 * Fallback web: timer diário client-side que exibe a notificação diretamente
 * via `new Notification()` (sem service worker — o app desregistra todos os
 * SWs em main.tsx, então `serviceWorker.ready` nunca resolveria). Requer a
 * aba aberta. No nativo é um no-op — o agendamento é do LocalNotifications.
 * Retorna uma função de parada.
 */
export function startReminderTimer(
  cfg: ReminderConfig,
  getPendingCount: () => number,
): () => void {
  if (!cfg.enabled || isNativeReminders()) return () => {};
  let timeoutId: number | null = null;
  let cancelled = false;

  const schedule = () => {
    if (cancelled) return;
    const delay = msUntilNext(cfg.hour, cfg.minute);
    timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      const today = new Date().toISOString().slice(0, 10);
      const lastSent = localStorage.getItem(LAST_SENT_KEY);
      if (lastSent !== today) {
        const pending = getPendingCount();
        if (
          pending > 0 &&
          notificationsSupported() &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification("Streaks — lembrete", {
              body:
                pending === 1
                  ? "Você ainda tem 1 hábito pendente hoje."
                  : `Você ainda tem ${pending} hábitos pendentes hoje.`,
            });
          } catch {
            // ignore — alguns navegadores exigem SW; sem ele, apenas não notifica
          }
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
