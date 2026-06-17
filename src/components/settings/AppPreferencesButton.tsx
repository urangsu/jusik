"use client";

import React, { useState } from "react";
import { Settings } from "lucide-react";
import { AppPreferencesDialog } from "./AppPreferencesDialog";
import { useI18n } from "@/i18n/use-i18n";

export const AppPreferencesButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { locale } = useI18n();

  return (
    <>
      <button
        id="app-preferences-button"
        onClick={() => setOpen(true)}
        title={locale === "ko" ? "앱 설정" : "App Preferences"}
        aria-label={locale === "ko" ? "앱 설정 열기" : "Open app preferences"}
        className="p-1.5 rounded text-kt-text-muted hover:text-kt-text-primary hover:bg-kt-bg-overlay-300 transition-colors cursor-pointer"
      >
        <Settings className="w-4 h-4" />
      </button>

      <AppPreferencesDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};
