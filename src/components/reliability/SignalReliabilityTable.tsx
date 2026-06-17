"use client";

import React from "react";
import { SignalReliabilityRecord } from "@/domain/reliability/signal-reliability-record";
import { useI18n } from "@/i18n/use-i18n";
import { MetricCell } from "../ui/MetricCell";

interface SignalReliabilityTableProps {
  records: SignalReliabilityRecord[];
}

const getSignalLabel = (id: string, isKo: boolean) => {
  const labels: Record<string, { ko: string; en: string }> = {
    momentum_ichimoku: { ko: "일목균형표 모멘텀", en: "Ichimoku Momentum" },
    momentum_darvas: { ko: "다윈 박스 모멘텀", en: "Darvas Box Momentum" },
    momentum_turtle: { ko: "터틀 채널 모멘텀", en: "Turtle Channel Momentum" },
    momentum_weinstein: { ko: "와인스타인 모멘텀", en: "Weinstein Momentum" },
    momentum_ma_slope: { ko: "이동평균 기울기", en: "MA Slope Momentum" },
    momentum_return: { ko: "수익률 모멘텀", en: "Return Momentum" },
    momentum_volatility: { ko: "변동성 역모멘텀", en: "Volatility Momentum" },
    momentum_volume: { ko: "거래량 모멘텀", en: "Volume Momentum" },
    momentum: { ko: "종합 모멘텀 Factor v1", en: "Combined Momentum Factor v1" },
  };
  return labels[id]?.[isKo ? "ko" : "en"] || id;
};

const getWarningLabel = (code: string, isKo: boolean) => {
  const labels: Record<string, { ko: string; en: string }> = {
    insufficient_sample: { ko: "표본 부족", en: "Insufficient sample" },
    low_ic: { ko: "낮은 IC", en: "Low IC" },
    negative_ic: { ko: "음의 IC (위험)", en: "Negative IC" },
    unstable_ic: { ko: "IC 변동성 높음", en: "Unstable IC" },
    low_hit_rate: { ko: "낮은 Hit Rate", en: "Low hit rate" },
    personal_fallback_used: { ko: "비공식 데이터", en: "Unofficial data" },
    sample_universe_only: { ko: "샘플 데이터", en: "Sample only" },
    not_for_investment_decision: { ko: "투자 판단 불가", en: "Not for investment" },
    missing_adjusted_price: { ko: "미조정 가격", en: "Unadjusted prices" },
    no_historical_universe_membership: { ko: "과거 구성원 미보정", en: "Unadjusted membership" },
  };
  return labels[code]?.[isKo ? "ko" : "en"] || code;
};

export const SignalReliabilityTable: React.FC<SignalReliabilityTableProps> = ({
  records,
}) => {
  const { t, locale } = useI18n();
  const isKo = locale === "ko";

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card overflow-hidden">
      <div className="px-4 py-3 border-b border-kt-border-panel flex items-center justify-between">
        <span className="text-xs font-semibold text-kt-text-primary">
          {isKo ? "신호별 과거 검증 결과 및 신뢰도" : "Signal Reliability Metrics"}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-kt-border-panel text-kt-text-muted bg-kt-bg-overlay-300/20">
              <th className="px-4 py-2 font-medium">{isKo ? "신호명" : "Signal"}</th>
              <th className="px-4 py-2 font-medium">{isKo ? "평가 기간" : "Horizon"}</th>
              <th className="px-4 py-2 font-medium text-right">{isKo ? "표본 수" : "Size"}</th>
              <th className="px-4 py-2 font-medium text-right">Spearman IC</th>
              <th className="px-4 py-2 font-medium text-right">ICIR</th>
              <th className="px-4 py-2 font-medium text-right">Hit Rate</th>
              <th className="px-4 py-2 font-medium text-right">
                {isKo ? "평균 초과수익률" : "Avg Excess Return"}
              </th>
              <th className="px-4 py-2 font-medium text-center">{isKo ? "신뢰도 점수" : "Score"}</th>
              <th className="px-4 py-2 font-medium text-right">
                {isKo ? "가중치 Preview" : "Weight Preview"}
              </th>
              <th className="px-4 py-2 font-medium">{isKo ? "주요 경고" : "Warnings"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kt-border-panel">
            {records.map((r) => {
              const isInsufficient = r.sampleSize < 10;
              const hasNegativeIc = r.warnings.includes("negative_ic");

              // Translate label
              let reliabilityText = "";
              let reliabilityColor = "text-kt-text-primary";
              if (isInsufficient) {
                reliabilityText = t("insufficientSample");
                reliabilityColor = "text-kt-text-muted font-normal";
              } else {
                reliabilityText = `${r.reliabilityScore} (${
                  r.reliabilityLabel === "low"
                    ? t("reliabilityLow")
                    : r.reliabilityLabel === "medium"
                    ? t("reliabilityMedium")
                    : t("reliabilityHigh")
                })`;

                if (r.reliabilityLabel === "low") {
                  reliabilityColor = "text-kt-negative-text font-medium";
                } else if (r.reliabilityLabel === "high") {
                  reliabilityColor = "text-kt-positive-text font-medium";
                }
              }

              return (
                <tr
                  key={r.id}
                  className="hover:bg-kt-bg-overlay-300/40 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-kt-text-primary">
                    {getSignalLabel(r.signalId, isKo)}
                  </td>
                  <td className="px-4 py-3 font-mono text-kt-text-secondary">
                    {r.horizon === "1w" ? (isKo ? "1주" : "1w") : r.horizon === "1m" ? (isKo ? "1개월" : "1m") : (isKo ? "3개월" : "3m")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-kt-text-secondary">
                    {r.sampleSize}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MetricCell
                      value={isInsufficient ? null : r.spearmanIcMean}
                      status={isInsufficient ? "insufficient_data" : "cached"}
                      formatter={(v) => (Number(v) >= 0 ? "+" : "") + Number(v).toFixed(4)}
                      changeType={
                        isInsufficient || r.spearmanIcMean === null
                          ? "neutral"
                          : r.spearmanIcMean > 0
                          ? "positive"
                          : "negative"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MetricCell
                      value={isInsufficient ? null : r.icir}
                      status={isInsufficient ? "insufficient_data" : "cached"}
                      formatter={(v) => (Number(v) >= 0 ? "+" : "") + Number(v).toFixed(4)}
                      changeType={
                        isInsufficient || r.icir === null
                          ? "neutral"
                          : r.icir > 0
                          ? "positive"
                          : "negative"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MetricCell
                      value={isInsufficient ? null : r.hitRate}
                      status={isInsufficient ? "insufficient_data" : "cached"}
                      formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MetricCell
                      value={isInsufficient ? null : r.avgExcessReturn}
                      status={isInsufficient ? "insufficient_data" : "cached"}
                      formatter={(v) => `${(Number(v) * 100).toFixed(2)}%`}
                      changeType={
                        isInsufficient || r.avgExcessReturn === null
                          ? "neutral"
                          : r.avgExcessReturn > 0
                          ? "positive"
                          : "negative"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={reliabilityColor}>{reliabilityText}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-kt-text-primary">
                    <MetricCell
                      value={isInsufficient ? null : r.weightMultiplier}
                      status={isInsufficient ? "insufficient_data" : "cached"}
                      formatter={(v) => `${Number(v).toFixed(3)}배`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.warnings
                        .filter(
                          (w) =>
                            w === "insufficient_sample" ||
                            w === "negative_ic" ||
                            w === "unstable_ic" ||
                            w === "low_hit_rate"
                        )
                        .map((w) => {
                          const isNegative = w === "negative_ic";
                          return (
                            <span
                              key={w}
                              className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                isNegative
                                  ? "bg-kt-negative-weak text-kt-negative-text border-kt-negative-text/20"
                                  : "bg-kt-bg-surface-100 text-kt-text-muted border-kt-border-panel"
                              }`}
                            >
                              {getWarningLabel(w, isKo)}
                            </span>
                          );
                        })}
                      {r.warnings.length === 0 && (
                        <span className="text-kt-text-muted font-mono">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
