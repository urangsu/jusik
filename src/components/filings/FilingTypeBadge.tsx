"use client";

import React from "react";
import { OpenDartDisclosureType } from "../../domain/opendart/opendart-disclosure-type";
import { useI18n } from "../../i18n/use-i18n";

interface FilingTypeBadgeProps {
  type: OpenDartDisclosureType | null;
}

export const FilingTypeBadge: React.FC<FilingTypeBadgeProps> = ({ type }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  if (!type) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] bg-kt-bg-overlay-300/40 text-kt-text-muted border border-kt-border-panel">
        {isKo ? "미지정" : "Unspecified"}
      </span>
    );
  }

  const labels: Record<OpenDartDisclosureType, { ko: string; en: string; color: string }> = {
    A: { ko: "정기공시", en: "Periodic", color: "bg-kt-bg-overlay-300 text-kt-text-primary border-kt-text-primary/20" },
    B: { ko: "주요사항보고", en: "Major Report", color: "bg-kt-negative-weak text-kt-negative-text border-kt-negative-text/20" },
    C: { ko: "발행공시", en: "Issuance", color: "bg-kt-positive-weak text-kt-positive-text border-kt-positive-text/20" },
    D: { ko: "지분공시", en: "Equity Disclosure", color: "bg-kt-bg-overlay-300 text-kt-text-secondary border-kt-border-panel" },
    E: { ko: "기타공시", en: "Other Disclosure", color: "bg-kt-bg-overlay-300 text-kt-text-muted border-kt-border-panel" },
    F: { ko: "외부감사관련", en: "External Audit", color: "bg-kt-bg-overlay-300 text-kt-text-muted border-kt-border-panel" },
    G: { ko: "펀드공시", en: "Fund", color: "bg-kt-bg-overlay-300 text-kt-text-muted border-kt-border-panel" },
    H: { ko: "자산유동화", en: "Securitization", color: "bg-kt-bg-overlay-300 text-kt-text-muted border-kt-border-panel" },
    I: { ko: "거래소공시", en: "Exchange", color: "bg-kt-bg-overlay-300 text-kt-text-secondary border-kt-border-panel" },
    J: { ko: "공정위공시", en: "Fair Trade", color: "bg-kt-bg-overlay-300 text-kt-text-muted border-kt-border-panel" },
  };

  const item = labels[type] || { ko: type, en: type, color: "bg-kt-bg-overlay-300 text-kt-text-muted border-kt-border-panel" };

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${item.color}`}>
      {isKo ? item.ko : item.en}
    </span>
  );
};
