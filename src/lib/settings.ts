export type Theme = "light" | "dark";

export interface AppSettings {
  theme: Theme;
  retroactiveLimitDays: number; // 0 = unlimited
  onboardingDone: boolean;
  defaultView: "today" | "habit";
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  retroactiveLimitDays: 0,
  onboardingDone: false,
  defaultView: "today",
};

export const SETTINGS_KEY = "app";
