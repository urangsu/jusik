"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "@/theme/theme-context";
import { useI18n } from "@/i18n/use-i18n";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleToggle } from "./LocaleToggle";
import { X, Settings, Info } from "lucide-react";

interface AppPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

export const AppPreferencesDialog: React.FC<AppPreferencesDialogProps> = ({
  open,
  onClose,
}) => {
  const { locale } = useI18n();
  const { resolvedTheme } = useTheme();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4"
      onClick={handleBackdrop}
      aria-modal="true"
      role="dialog"
      aria-label={locale === "ko" ? "앱 설정" : "App Preferences"}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        className="relative z-10 w-80 bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card shadow-2xl flex flex-col gap-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-kt-border-panel">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-kt-text-muted" />
            <span className="text-sm font-bold text-kt-text-primary">
              {locale === "ko" ? "K-Terminal 앱 설정" : "K-Terminal App Preferences"}
            </span>
          </div>
          <button
            id="app-prefs-close"
            onClick={onClose}
            className="p-1 rounded text-kt-text-muted hover:text-kt-text-primary cursor-pointer"
            aria-label={locale === "ko" ? "닫기" : "Close"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings sections */}
        <div className="flex flex-col gap-0 divide-y divide-kt-border-panel">
          {/* Theme */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-kt-text-muted uppercase tracking-wider">
              {locale === "ko" ? "테마" : "Theme"}
            </label>
            <ThemeToggle locale={locale} />
          </div>

          {/* Language */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-kt-text-muted uppercase tracking-wider">
              {locale === "ko" ? "언어" : "Language"}
            </label>
            <LocaleToggle />
          </div>

          {/* Number format */}
          <div className="px-5 py-4 flex flex-col gap-2">
            <label className="text-[11px] font-semibold text-kt-text-muted uppercase tracking-wider">
              {locale === "ko" ? "숫자 표시" : "Number Format"}
            </label>
            <span className="text-xs text-kt-text-muted">
              {locale === "ko"
                ? "한국 원화(KRW) 기본 — 미국 달러(USD) 선택 예정"
                : "KRW default — USD option coming soon"}
            </span>
          </div>

          {/* Disclaimer */}
          <div className="px-5 py-4 bg-kt-bg-overlay-300/40 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-kt-text-muted flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-kt-text-muted leading-relaxed">
              {locale === "ko"
                ? "이 설정은 K-Terminal 앱 자체 설정입니다. 브라우저 개발도구(DevTools) 설정과 무관합니다."
                : "These are K-Terminal app settings, independent of browser DevTools preferences."}
            </p>
          </div>
        </div>

        {/* Resolved info */}
        <div className="px-5 py-2.5 border-t border-kt-border-panel flex items-center gap-1.5">
          <span className="text-[10px] text-kt-text-muted">
            {locale === "ko" ? "현재 테마:" : "Active theme:"}
          </span>
          <span className="text-[10px] font-semibold text-kt-text-secondary uppercase">
            {resolvedTheme}
          </span>
        </div>
      </div>
    </div>
  );
};
