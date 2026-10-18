/** Meridiqa branding keys with backward-compatible ShowUp fallbacks. */

export const THEME_KEY = "meridiqa-theme";
export const THEME_KEY_LEGACY = "showup-theme";

export const DEMO_COOKIE = "meridiqa_demo";
export const DEMO_COOKIE_LEGACY = "showup_demo";

export const REPORT_DRAFTS_KEY = "meridiqa:report-drafts";
export const REPORT_DRAFTS_KEY_LEGACY = "showup:report-drafts";

export function readThemePreference(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(THEME_KEY) ?? window.localStorage.getItem(THEME_KEY_LEGACY);
}

export function writeThemePreference(value: "dark" | "light") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, value);
  window.localStorage.removeItem(THEME_KEY_LEGACY);
}

export function readReportDraftsRaw(): string | null {
  if (typeof window === "undefined") return null;
  const next = window.localStorage.getItem(REPORT_DRAFTS_KEY);
  if (next) return next;
  const legacy = window.localStorage.getItem(REPORT_DRAFTS_KEY_LEGACY);
  if (legacy) {
    window.localStorage.setItem(REPORT_DRAFTS_KEY, legacy);
    window.localStorage.removeItem(REPORT_DRAFTS_KEY_LEGACY);
  }
  return legacy;
}

export function writeReportDraftsRaw(value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REPORT_DRAFTS_KEY, value);
  window.localStorage.removeItem(REPORT_DRAFTS_KEY_LEGACY);
}
