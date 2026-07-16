import { en, type Messages } from "./en";
import { tr } from "./tr";
import { normalizeLocale, type Locale } from "./locales";

export * from "./locales";
export type { Messages };

const catalogs: Record<Locale, Messages> = { en, tr };

/** Unknown/missing locales fall back to English. */
export function getMessages(locale: unknown): Messages {
  return catalogs[normalizeLocale(locale)];
}
