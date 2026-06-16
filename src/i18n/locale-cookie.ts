import { Locale, DEFAULT_LOCALE } from "./locale";

export const LOCALE_COOKIE_NAME = "locale";

/**
 * Parses the locale value from a cookie string.
 */
export function getLocaleFromCookieString(cookieStr: string): Locale {
  const match = cookieStr.match(new RegExp(`(^|;)\\s*${LOCALE_COOKIE_NAME}\\s*=\\s*([^;]+)`));
  const val = match ? match[2] : null;
  return val === "ko" || val === "en" ? val : DEFAULT_LOCALE;
}

/**
 * Sets the locale in a browser cookie.
 */
export function setLocaleCookie(locale: Locale): void {
  if (typeof document !== "undefined") {
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
  }
}
