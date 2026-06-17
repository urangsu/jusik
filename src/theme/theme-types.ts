/**
 * K-Terminal App Theme
 *
 * "system" resolves to dark or light based on OS preference.
 * Default is "dark" — K-Terminal is a financial terminal.
 */
export type AppTheme = "dark" | "light" | "system";

export const DEFAULT_THEME: AppTheme = "dark";

/** Cookie name for persisting theme across SSR/CSR */
export const THEME_COOKIE_NAME = "kt-theme";

/** localStorage key */
export const THEME_STORAGE_KEY = "kt-theme";

/** The resolved data-theme value applied to <html> (never "system") */
export type ResolvedTheme = "dark" | "light";
