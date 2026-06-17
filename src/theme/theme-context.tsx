"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  AppTheme,
  DEFAULT_THEME,
  ResolvedTheme,
} from "./theme-types";
import {
  applyTheme,
  getThemeFromStorage,
  persistTheme,
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

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialTheme?: AppTheme;
}> = ({ children, initialTheme = DEFAULT_THEME }) => {
  // Use a function initializer so we only run the client-side check once.
  const [theme, setThemeState] = useState<AppTheme>(() => {
    if (typeof window !== "undefined") {
      // URL query takes top priority
      const urlParams = new URLSearchParams(window.location.search);
      const queryTheme = urlParams.get("theme");
      if (
        queryTheme === "dark" ||
        queryTheme === "light" ||
        queryTheme === "system"
      ) {
        return queryTheme as AppTheme;
      }
      // localStorage second
      const stored = getThemeFromStorage();
      if (stored) return stored;
    }
    return initialTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(theme)
  );

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyTheme(theme);
    setResolvedTheme(resolveTheme(theme));
  }, [theme]);

  // Listen for system preference changes when theme === "system"
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      applyTheme("system");
      setResolvedTheme(resolveTheme("system"));
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    persistTheme(newTheme);
    applyTheme(newTheme);
    setResolvedTheme(resolveTheme(newTheme));
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
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
