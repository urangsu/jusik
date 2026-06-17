"use client";

import React from "react";
import { useI18n } from "@/i18n/use-i18n";
import { ReliabilityAdjustedMomentumPreview } from "@/domain/reliability/reliability-adjusted-momentum";
import { MetricCell } from "../ui/MetricCell";

interface WeightMultiplierPreviewProps {
  preview: ReliabilityAdjustedMomentumPreview;
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
  };
  return labels[id]?.[isKo ? "ko" : "en"] || id;
};

const getReasonLabel = (reason: string | null, isKo: boolean) => {
  if (!reason) return "-";
  const labels: Record<string, { ko: string; en: string }> = {
    insufficient_sample: { ko: "표본 부족 (기본값 적용)", en: "Short sample (applied default)" },
    usable: { ko: "적정 (제한 보정)", en: "Usable (bounded adjust)" },
    robust: { ko: "충분 (자유 보정)", en: "Robust (full adjust)" },
  };
  return labels[reason]?.[isKo ? "ko" : "en"] || reason;
};

const getTrendLabel = (label: string, isKo: boolean) => {
  const labels: Record<string, { ko: string; en: string }> = {
    bullish: { ko: "상승 (Bullish)", en: "Bullish" },
    bearish: { ko: "하락 (Bearish)", en: "Bearish" },
    neutral: { ko: "중립 (Neutral)", en: "Neutral" },
    insufficient_data: { ko: "데이터 부족", en: "Insufficient data" },
  };
  return labels[label]?.[isKo ? "ko" : "en"] || label;
};

export const WeightMultiplierPreview: React.FC<WeightMultiplierPreviewProps> = ({
  preview,
}) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-4">
      {/* Header Comparison */}
      <div className="flex items-center justify-between border-b border-kt-border-panel pb-3 flex-wrap gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-xs font-semibold text-kt-text-primary">
            {isKo ? "가중치 조절 시뮬레이션 Preview" : "Weight Calibration Preview"}
          </h3>
          <span className="text-[10px] text-kt-text-muted">
            {isKo
              ? "이 가중치는 시뮬레이션 전용이며 실제 Factor 가중치에 영향을 주지 않습니다."
              : "This preview is experimental and does not alter stored live weights."}
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs bg-kt-bg-overlay-300/40 px-3 py-1.5 rounded-kt-card border border-kt-border-panel">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-kt-text-muted">{isKo ? "기본 모멘텀" : "Base Momentum"}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-bold font-mono text-kt-text-primary">
                {preview.baseMomentumScore ?? "N/A"}
              </span>
              <span className="text-[9px] text-kt-text-secondary">
                ({getTrendLabel(preview.baseLabel, isKo)})
              </span>
            </div>
          </div>
          <span className="text-kt-text-muted">→</span>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-kt-text-muted">{isKo ? "보정 모멘텀" : "Adjusted Momentum"}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-bold font-mono text-kt-positive-text">
                {preview.reliabilityAdjustedScore ?? "N/A"}
              </span>
              <span className="text-[9px] text-kt-text-secondary">
                ({getTrendLabel(preview.reliabilityAdjustedLabel, isKo)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Multipliers Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-kt-border-panel text-kt-text-muted">
              <th className="py-2 font-medium">{isKo ? "구성 신호" : "Signal Component"}</th>
              <th className="py-2 font-medium text-right">{isKo ? "기본 가중치" : "Base Weight"}</th>
              <th className="py-2 font-medium text-right">{isKo ? "신뢰도 배수" : "Multiplier"}</th>
              <th className="py-2 font-medium text-right">{isKo ? "실효 가중치" : "Effective Weight"}</th>
              <th className="py-2 font-medium">{isKo ? "보정 근거" : "Reason / Status"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kt-border-panel/40">
            {preview.appliedMultipliers.map((m) => {
              const isInsufficient = m.reliabilityWeightMultiplier === null;
              
              return (
                <tr key={m.signalId} className="hover:bg-kt-bg-overlay-300/10 transition-colors">
                  <td className="py-2.5 font-medium text-kt-text-primary">
                    {getSignalLabel(m.signalId, isKo)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-kt-text-secondary">
                    {(m.baseWeight * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 text-right">
                    <MetricCell
                      value={isInsufficient ? null : m.reliabilityWeightMultiplier}
                      status={isInsufficient ? "insufficient_data" : "cached"}
                      formatter={(v) => `${Number(v).toFixed(3)}배`}
                    />
                  </td>
                  <td className="py-2.5 text-right font-mono font-medium text-kt-text-primary">
                    {m.effectiveWeight !== null
                      ? `${(m.effectiveWeight * 100).toFixed(2)}%`
                      : `${(m.baseWeight * 100).toFixed(2)}%`}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`text-[10px] ${
                        m.reason === "insufficient_sample"
                          ? "text-kt-text-muted"
                          : m.reason === "robust"
                          ? "text-kt-positive-text font-medium"
                          : "text-kt-text-secondary"
                      }`}
                    >
                      {getReasonLabel(m.reason, isKo)}
                    </span>
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
