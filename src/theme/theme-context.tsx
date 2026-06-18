"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  AppTheme,
  DEFAULT_THEME,
  ResolvedTheme,
  ThemePreference,
} from "./theme-types";
import {
  resolveTheme,
} from "./theme-storage";

interface ThemeContextType {
  /** User-facing setting: "dark" | "light" | "system" */
  theme: AppTheme;
  /** Resolved value after applying system preference */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialTheme?: AppTheme;
  initialThemePreference?: ThemePreference;
  initialResolvedTheme?: ResolvedTheme;
}> = ({
  children,
  initialTheme,
  initialThemePreference: propPref,
  initialResolvedTheme: propResolved,
}) => {
  const initPref = propPref || initialTheme || DEFAULT_THEME;
  const initResolved = propResolved || resolveTheme(initPref);

  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(initPref);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(initResolved);

  // Synchronize client-side values on mount to prevent mismatch and handle url/storage/cookie changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    let clientPref: ThemePreference | null = null;

    // 1. URL search param
    const urlParams = new URLSearchParams(window.location.search);
    const queryTheme = urlParams.get("theme");
    if (queryTheme === "dark" || queryTheme === "light" || queryTheme === "system") {
      clientPref = queryTheme as ThemePreference;
    }

    // 2. Cookie check
    if (!clientPref) {
      const match = document.cookie.match(/(?:^|;)\s*kt-theme\s*=\s*([^;]+)/);
      if (match && (match[1] === "dark" || match[1] === "light" || match[1] === "system")) {
        clientPref = match[1] as ThemePreference;
      }
    }

    // 3. LocalStorage check
    if (!clientPref) {
      try {
        const stored = localStorage.getItem("kt-theme");
        if (stored === "dark" || stored === "light" || stored === "system") {
          clientPref = stored as ThemePreference;
        }
      } catch {}
    }

    // Determine final preference
    const finalPref = clientPref || themePreference;

    // Align cookie and localStorage
    document.cookie = `kt-theme=${finalPref}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem("kt-theme", finalPref);
    } catch {}

    // Apply if changed
    if (finalPref !== themePreference) {
      setThemePreferenceState(finalPref);
      const resolved = finalPref === "system" ? resolveSystemTheme() : finalPref;
      setResolvedTheme(resolved);
      document.documentElement.dataset.theme = resolved;
      document.documentElement.dataset.themePreference = finalPref;
    } else {
      // If system theme, align resolved theme with prefers-color-scheme
      if (finalPref === "system") {
        const resolved = resolveSystemTheme();
        if (resolved !== resolvedTheme) {
          setResolvedTheme(resolved);
          document.documentElement.dataset.theme = resolved;
          document.documentElement.dataset.themePreference = "system";
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for system color scheme changes when system theme is active
  useEffect(() => {
    if (themePreference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const next = media.matches ? "dark" : "light";
      setResolvedTheme(next);
      document.documentElement.dataset.theme = next;
      document.documentElement.dataset.themePreference = "system";
    };

    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [themePreference]);

  const setTheme = (next: ThemePreference) => {
    const nextResolved = next === "system" ? resolveSystemTheme() : next;

    setThemePreferenceState(next);
    setResolvedTheme(nextResolved);

    document.documentElement.dataset.theme = nextResolved;
    document.documentElement.dataset.themePreference = next;

    document.cookie = `kt-theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    try {
      localStorage.setItem("kt-theme", next);
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme: themePreference, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Graceful fallback outside provider
    return {
      theme: DEFAULT_THEME,
      resolvedTheme: "dark",
      setTheme: () => {},
    };
  }
  return ctx;
};
