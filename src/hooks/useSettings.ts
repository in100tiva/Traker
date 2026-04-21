import { useCallback, useEffect, useState } from "react";
import type { DbBundle } from "@/db/client";
import { getSetting, setSetting } from "@/db/queries";
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  type AppSettings,
} from "@/lib/settings";

export function useSettings(bundle: DbBundle | null) {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    getSetting<AppSettings>(bundle.db, SETTINGS_KEY)
      .then((value) => {
        if (cancelled) return;
        setSettingsState({ ...DEFAULT_SETTINGS, ...(value ?? {}) });
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [bundle]);

  useEffect(() => {
    if (!loaded) return;
    const html = document.documentElement;
    html.classList.toggle("dark", settings.theme === "dark");
    html.classList.toggle("light", settings.theme === "light");
  }, [settings.theme, loaded]);

  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...patch };
        if (bundle) {
          void setSetting(bundle.db, SETTINGS_KEY, next);
        }
        return next;
      });
    },
    [bundle],
  );

  return { settings, update, loaded };
}
