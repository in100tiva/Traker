/**
 * App bootstrap: ensures install_id and timezone are present in settings,
 * records lifecycle events (install, app_open) on startup. Idempotent.
 *
 * Pure side-effect functions accepting the bundle. Called once after the DB
 * is ready, from useDb-aware effects in App.tsx.
 */

import type { DbBundle } from "@/db/client";
import { getSetting, recordEvent, setSetting } from "@/db/queries";
import { getUserTimezone } from "./timezone";

const INSTALL_KEY = "install";
const REENGAGE_KEY = "lastSeenAt";

interface InstallSettings {
  installId: string;
  installedAt: string;
  timezone: string;
}

function generateInstallId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `inst_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Returns the install record, creating it (and emitting an "install" event)
 * on first run. Always emits an "app_open" event with timestamp.
 */
export async function bootstrap(
  bundle: DbBundle,
): Promise<{ installId: string; firstRun: boolean; daysAway: number }> {
  let install = await getSetting<InstallSettings>(bundle.db, INSTALL_KEY);
  let firstRun = false;

  if (!install) {
    install = {
      installId: generateInstallId(),
      installedAt: new Date().toISOString(),
      timezone: getUserTimezone(),
    };
    await setSetting(bundle.db, INSTALL_KEY, install);
    await recordEvent(bundle.db, {
      type: "install",
      payload: { installId: install.installId, timezone: install.timezone },
    });
    firstRun = true;
  } else if (install.timezone !== getUserTimezone()) {
    // User moved or system locale changed
    install = { ...install, timezone: getUserTimezone() };
    await setSetting(bundle.db, INSTALL_KEY, install);
  }

  await recordEvent(bundle.db, {
    type: "app_open",
    payload: { timezone: install.timezone },
  });

  // Compute days since last "lastSeenAt" tick to enable re-engagement copy.
  const lastSeen = await getSetting<{ at: string }>(bundle.db, REENGAGE_KEY);
  const now = new Date();
  let daysAway = 0;
  if (lastSeen?.at) {
    const ms = now.getTime() - new Date(lastSeen.at).getTime();
    daysAway = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }
  await setSetting(bundle.db, REENGAGE_KEY, { at: now.toISOString() });

  return { installId: install.installId, firstRun, daysAway };
}

export async function trackActivationOnFirstCheck(
  bundle: DbBundle,
): Promise<void> {
  // Recorded once: an "activation" event (the user marked their first habit).
  // We don't dedup at the DB level; caller decides when to invoke.
  await recordEvent(bundle.db, { type: "activation" });
}
