// Locale primitives, importable from client and server code alike.

export const LOCALES = ["en", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie the UI language persists in; read server-side per request. */
export const LOCALE_COOKIE = "lang";

/** Anything unknown falls back to English. */
export function normalizeLocale(value: unknown): Locale {
  return value === "tr" ? "tr" : DEFAULT_LOCALE;
}

/** BCP 47 tag for Intl formatting. */
export function dateLocale(locale: Locale): string {
  return locale === "tr" ? "tr-TR" : "en-US";
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
};
