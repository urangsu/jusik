import { cookies } from "next/headers";
import { Locale, DEFAULT_LOCALE } from "./locale";
import { LOCALE_COOKIE_NAME } from "./locale-cookie";

/**
 * Resolves the locale dynamically on the server side (SSR / Server Component / Route Handler).
 * Order: searchParams.lang -> Cookie -> DEFAULT_LOCALE
 */
export async function getServerLocale(searchParamsLang?: string): Promise<Locale> {
  // 1. searchParams.lang check
  if (searchParamsLang === "ko" || searchParamsLang === "en") {
    return searchParamsLang;
  }

  // 2. Cookie check
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    if (val === "ko" || val === "en") {
      return val;
    }
  } catch {
    // Silently fall back if cookies() is not available (e.g., static generation)
  }

  // 3. Fallback to default
  return DEFAULT_LOCALE;
}
