"use client";

import React from "react";
import { useI18n } from "@/i18n/use-i18n";

export const ReliabilityWarningBanner: React.FC = () => {
  const { t, locale } = useI18n();

  return (
    <div
      role="alert"
      aria-label={locale === "ko" ? "신뢰도 검증 경고" : "Reliability verification warning"}
      className="w-full px-4 py-3 border-b border-kt-border-panel bg-kt-bg-overlay-300/60 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-0.5 max-w-5xl mx-auto">
        <p className="text-xs font-semibold text-kt-text-primary tracking-wide uppercase">
          {t("notInvestmentAdvice")}
        </p>
        <p className="text-xs text-kt-text-secondary leading-relaxed">
          {t("warningReliabilityBanner")}
        </p>
      </div>
    </div>
  );
};
