"use client";

import React from "react";
import { useI18n } from "@/i18n/use-i18n";

interface SignalPostmortemSummaryProps {
  postmortemSummary?: {
    signalPostmortemCount: number;
    failedPositionCount: number;
    positivePositionCount: number;
    negativePositionCount: number;
    missingPricePositionCount: number;
  };
}

export const SignalPostmortemSummary: React.FC<SignalPostmortemSummaryProps> = ({
  postmortemSummary,
}) => {
  const { locale } = useI18n();

  if (!postmortemSummary) {
    return null;
  }

  const {
    signalPostmortemCount,
    positivePositionCount,
    negativePositionCount,
    missingPricePositionCount,
  } = postmortemSummary;

  const flatCount = signalPostmortemCount - positivePositionCount - negativePositionCount - missingPricePositionCount;

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4">
      <h3 className="text-xs font-semibold text-kt-text-primary mb-3">
        {locale === "ko" ? "신호 사후검토 요약 (Signal Postmortem)" : "Signal Postmortem Summary"}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
        <div className="bg-kt-bg-surface-200/50 p-2.5 rounded-kt-card border border-kt-border-panel/40">
          <div className="text-[10px] text-kt-text-muted uppercase mb-1">
            {locale === "ko" ? "전체 포지션" : "Total"}
          </div>
          <div className="text-lg font-bold text-kt-text-primary tabular-nums">
            {signalPostmortemCount}
          </div>
        </div>

        <div className="bg-kt-bg-surface-200/50 p-2.5 rounded-kt-card border border-kt-border-panel/40">
          <div className="text-[10px] text-kt-text-muted uppercase mb-1">
            {locale === "ko" ? "성공 (Positive)" : "Positive"}
          </div>
          <div className="text-lg font-bold text-kt-positive-text tabular-nums">
            {positivePositionCount}
          </div>
        </div>

        <div className="bg-kt-bg-surface-200/50 p-2.5 rounded-kt-card border border-kt-border-panel/40">
          <div className="text-[10px] text-kt-text-muted uppercase mb-1">
            {locale === "ko" ? "실패 (Negative)" : "Negative"}
          </div>
          <div className="text-lg font-bold text-kt-negative-text tabular-nums">
            {negativePositionCount}
          </div>
        </div>

        <div className="bg-kt-bg-surface-200/50 p-2.5 rounded-kt-card border border-kt-border-panel/40">
          <div className="text-[10px] text-kt-text-muted uppercase mb-1">
            {locale === "ko" ? "보합 (Flat)" : "Flat"}
          </div>
          <div className="text-lg font-bold text-kt-text-primary tabular-nums">
            {flatCount >= 0 ? flatCount : 0}
          </div>
        </div>

        <div className="bg-kt-bg-surface-200/50 p-2.5 rounded-kt-card border border-kt-border-panel/40">
          <div className="text-[10px] text-kt-text-muted uppercase mb-1">
            {locale === "ko" ? "가격 누락" : "Missing Price"}
          </div>
          <div className="text-lg font-bold text-kt-text-muted tabular-nums">
            {missingPricePositionCount}
          </div>
        </div>
      </div>
    </div>
  );
};
