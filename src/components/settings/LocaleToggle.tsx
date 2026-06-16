"use client";

import React from "react";
import { useI18n } from "@/i18n/use-i18n";

export const LocaleToggle: React.FC = () => {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center bg-kt-bg-overlay-300 border border-kt-border-panel p-0.5 rounded-kt-pill select-none">
      <button
        onClick={() => setLocale("ko")}
        className={`px-3 py-1 text-xs font-semibold rounded-kt-pill transition-all duration-150 cursor-pointer ${
          locale === "ko"
            ? "bg-kt-bg-surface-100 text-kt-text-primary border border-kt-border-panel/40"
            : "text-kt-text-muted hover:text-kt-text-primary"
        }`}
      >
        KO
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`px-3 py-1 text-xs font-semibold rounded-kt-pill transition-all duration-150 cursor-pointer ${
          locale === "en"
            ? "bg-kt-bg-surface-100 text-kt-text-primary border border-kt-border-panel/40"
            : "text-kt-text-muted hover:text-kt-text-primary"
        }`}
      >
        EN
      </button>
    </div>
  );
};
