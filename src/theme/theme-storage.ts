import {
  AppTheme,
  DEFAULT_THEME,
  ResolvedTheme,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  ThemePreference,
} from "./theme-types";

// ---------------------------------------------------------------------------
// Server-side helpers (no DOM access)
// ---------------------------------------------------------------------------

/**
 * Normalizes any value to a valid ThemePreference.
 */
export function normalizeThemePreference(value: unknown): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "dark";
}

/**
 * Resolves the theme to be set on the server ("light" or "dark", never "system").
 */
export function resolveThemeForServer(preference: ThemePreference): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return "dark"; // "system" defaults to "dark" on the server
}

/**
 * Parse AppTheme from a raw cookie string (e.g. document.cookie on server).
 * Safe to call in RSC / middleware.
 */
export function getThemeFromCookieString(cookieStr: string): AppTheme | null {
  const match = cookieStr.match(
    new RegExp(`(^|;)\\s*${THEME_COOKIE_NAME}\\s*=\\s*([^;]+)`)
  );
  const val = match ? match[2].trim() : null;
  if (val === "dark" || val === "light" || val === "system") return val;
  return null;
}

/**
 * Returns the initial AppTheme from searchParams → cookie → default.
 * Used in Server Components / layout.tsx.
 */
export function resolveServerTheme(
  searchParamsTheme?: string,
  cookieStr?: string
): AppTheme {
  if (
    searchParamsTheme === "dark" ||
    searchParamsTheme === "light" ||
    searchParamsTheme === "system"
  ) {
    return searchParamsTheme;
  }
  if (cookieStr) {
    const fromCookie = getThemeFromCookieString(cookieStr);
    if (fromCookie) return fromCookie;
  }
  return DEFAULT_THEME;
}

// ---------------------------------------------------------------------------
// Client-side helpers (DOM access guarded)
// ---------------------------------------------------------------------------

/** Resolves "system" to actual dark/light based on OS preference. */
export function resolveTheme(theme: AppTheme): ResolvedTheme {
  if (theme === "system") {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
      return "light";
    }
    return "dark";
  }
  return theme;
}

/** Applies the resolved theme and preference to <html> dataset. */
export function applyTheme(theme: AppTheme): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = theme;
}

/** Persists theme to cookie + localStorage. */
export function persistTheme(theme: AppTheme): void {
  if (typeof document !== "undefined") {
    document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
  }
}

/** Reads theme from localStorage (client-only). */
export function getThemeFromStorage(): AppTheme | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === "dark" || val === "light" || val === "system") return val;
  } catch {
    // ignore
  }
  return null;
}
