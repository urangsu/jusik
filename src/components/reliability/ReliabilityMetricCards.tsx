"use client";

import React from "react";
import { useI18n } from "@/i18n/use-i18n";
import { ReliabilitySummary } from "@/domain/reliability/reliability-summary";

interface ReliabilityMetricCardsProps {
  summary: ReliabilitySummary;
}

export const ReliabilityMetricCards: React.FC<ReliabilityMetricCardsProps> = ({
  summary,
}) => {
  const { t } = useI18n();

  const cards = [
    {
      label: t("totalSignalsLabel"),
      value: summary.aggregate.totalSignals,
      color: "text-kt-text-primary",
      description: "분석 대상 총 원자 신호 및 팩터 수",
    },
    {
      label: t("robustSignalsLabel"),
      value: summary.aggregate.robustSignals,
      color: "text-kt-positive-text",
      description: "신뢰할 수 있는 수준의 표본(>=30) 확보 신호",
    },
    {
      label: "표본 부족 신호 수",
      value: summary.aggregate.insufficientSampleSignals,
      color: "text-kt-text-muted",
      description: "신뢰도 연산 기준 표본 미달 신호 수",
    },
    {
      label: "Negative IC 신호 수",
      value: summary.aggregate.negativeIcSignals,
      color: "text-kt-negative-text",
      description: "미래 수익률과 역상관이 발견된 경고 신호 수",
    },
    {
      label: "Fallback API 영향 수",
      value: summary.aggregate.personalFallbackAffectedSignals,
      color: "text-kt-text-muted",
      description: "비공식 데이터 소스로 연산된 신호 수",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c, idx) => (
        <div
          key={idx}
          className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col justify-between gap-1 h-full"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-kt-text-muted font-medium uppercase tracking-wider">
              {c.label}
            </span>
            <span className="text-xs text-kt-text-muted leading-snug">
              {c.description}
            </span>
          </div>
          <div className="mt-3">
            <span className={`text-xl font-bold tabular-nums ${c.color}`}>
              {c.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
