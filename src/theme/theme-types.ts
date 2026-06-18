export type ThemePreference = "dark" | "light" | "system";
export type AppTheme = ThemePreference;

export const DEFAULT_THEME: ThemePreference = "dark";

/** Cookie name for persisting theme across SSR/CSR */
export const THEME_COOKIE_NAME = "kt-theme";

/** localStorage key */
export const THEME_STORAGE_KEY = "kt-theme";

/** The resolved data-theme value applied to <html> (never "system") */
export type ResolvedTheme = "dark" | "light";
