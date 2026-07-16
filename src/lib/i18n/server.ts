import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, normalizeLocale, type Locale } from "./locales";

/**
 * The request's UI locale, from the `lang` cookie. Server components, API
 * routes, and server actions all read it here, so the page renders in the
 * selected language on the server — no client-side language flash.
 * Falls back to English outside a request scope (e.g. unit tests).
 */
export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  } catch {
    return DEFAULT_LOCALE;
  }
}
