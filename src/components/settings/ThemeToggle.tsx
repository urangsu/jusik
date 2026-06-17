"use client";

import React from "react";
import { useTheme } from "@/theme/theme-context";
import { AppTheme } from "@/theme/theme-types";
import { Sun, Moon, Monitor } from "lucide-react";

interface ThemeOption {
  value: AppTheme;
  labelKo: string;
  labelEn: string;
  icon: React.ReactNode;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "dark",
    labelKo: "다크",
    labelEn: "Dark",
    icon: <Moon className="w-3.5 h-3.5" />,
  },
  {
    value: "light",
    labelKo: "라이트",
    labelEn: "Light",
    icon: <Sun className="w-3.5 h-3.5" />,
  },
  {
    value: "system",
    labelKo: "시스템",
    labelEn: "System",
    icon: <Monitor className="w-3.5 h-3.5" />,
  },
];

interface ThemeToggleProps {
  locale?: "ko" | "en";
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  locale = "ko",
  compact = false,
}) => {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <div
        className="flex items-center bg-kt-bg-overlay-300 border border-kt-border-panel p-0.5 rounded-kt-pill select-none"
        role="group"
        aria-label={locale === "ko" ? "테마 선택" : "Theme selection"}
      >
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              id={`theme-toggle-${opt.value}`}
              onClick={() => setTheme(opt.value)}
              title={locale === "ko" ? opt.labelKo : opt.labelEn}
              aria-pressed={isActive}
              className={`p-1.5 rounded-kt-pill transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-kt-bg-surface-100 text-kt-text-primary border border-kt-border-panel/40"
                  : "text-kt-text-muted hover:text-kt-text-primary"
              }`}
            >
              {opt.icon}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 bg-kt-bg-overlay-300 border border-kt-border-panel p-0.5 rounded-kt-pill select-none"
      role="group"
      aria-label={locale === "ko" ? "테마 선택" : "Theme selection"}
    >
      {THEME_OPTIONS.map((opt) => {
        const isActive = theme === opt.value;
        return (
          <button
            key={opt.value}
            id={`theme-toggle-${opt.value}`}
            onClick={() => setTheme(opt.value)}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-kt-pill transition-all duration-150 cursor-pointer ${
              isActive
                ? "bg-kt-bg-surface-100 text-kt-text-primary border border-kt-border-panel/40"
                : "text-kt-text-muted hover:text-kt-text-primary"
            }`}
          >
            {opt.icon}
            <span>{locale === "ko" ? opt.labelKo : opt.labelEn}</span>
          </button>
        );
      })}
    </div>
  );
};
