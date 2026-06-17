"use client";

import React from "react";
import { BacktestWarningCode } from "@/domain/backtest/backtest-result";
import { useI18n } from "@/i18n/use-i18n";

const VETO_LABELS: Record<BacktestWarningCode, { ko: string; en: string }> = {
  sample_universe_only: { ko: "샘플 유니버스 한정", en: "Sample universe only" },
  personal_fallback_used: { ko: "비공식 데이터 소스 사용", en: "Unofficial data source used" },
  missing_adjusted_price: { ko: "수정주가 미적용", en: "Unadjusted prices" },
  no_historical_universe_membership: { ko: "과거 유니버스 구성 미반영", en: "No historical universe membership" },
  not_for_investment_decision: { ko: "투자 판단 불가", en: "Not for investment decision" },
  insufficient_universe: { ko: "유니버스 자산 부족", en: "Insufficient universe" },
  low_data_quality: { ko: "데이터 품질 낮음", en: "Low data quality" },
  insufficient_oos_windows: { ko: "OOS 구간 부족", en: "Insufficient OOS windows" },
};

interface BacktestVetoReasonsProps {
  vetoReasons: BacktestWarningCode[];
  warnings: BacktestWarningCode[];
}

export const BacktestVetoReasons: React.FC<BacktestVetoReasonsProps> = ({
  vetoReasons,
  warnings,
}) => {
  const { locale } = useI18n();

  if (vetoReasons.length === 0 && warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {vetoReasons.length > 0 && (
        <div className="border border-kt-border-panel rounded-kt-card p-3 bg-kt-bg-surface-100">
          <p className="text-xs font-semibold text-kt-text-primary mb-1.5">
            {locale === "ko" ? "결과 신뢰도 제한 사유" : "Result Reliability Limits"}
          </p>
          <ul className="flex flex-col gap-1">
            {vetoReasons.map((r) => (
              <li
                key={r}
                className="text-xs text-kt-text-secondary flex items-start gap-1.5"
              >
                <span className="text-kt-negative-text font-mono text-[10px] mt-0.5 flex-shrink-0">
                  [제한]
                </span>
                <span>{locale === "ko" ? VETO_LABELS[r].ko : VETO_LABELS[r].en}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="border border-kt-border-panel rounded-kt-card p-3 bg-kt-bg-surface-100">
          <p className="text-xs font-semibold text-kt-text-primary mb-1.5">
            {locale === "ko" ? "데이터 경고" : "Data Warnings"}
          </p>
          <ul className="flex flex-col gap-1">
            {warnings.map((w) => (
              <li
                key={w}
                className="text-xs text-kt-text-secondary flex items-start gap-1.5"
              >
                <span className="text-kt-text-muted font-mono text-[10px] mt-0.5 flex-shrink-0">
                  [경고]
                </span>
                <span>{locale === "ko" ? VETO_LABELS[w]?.ko : VETO_LABELS[w]?.en}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
