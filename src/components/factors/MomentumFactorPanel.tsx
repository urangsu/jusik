import React from "react";
import { MomentumFactorResult } from "@/server/factors/momentum-factor-v1";
import { AtomicSignal } from "@/domain/factors/atomic-signal";
import { FactorDataStatusBadge } from "./FactorDataStatusBadge";
import { TechnicalSignalList } from "./TechnicalSignalList";
import { useI18n } from "@/i18n/use-i18n";
import { AlertTriangle, TrendingUp, TrendingDown, Gauge } from "lucide-react";

interface MomentumFactorPanelProps {
  assetName: string;
  symbol: string;
  momentumResult: MomentumFactorResult;
  atomicSignals: AtomicSignal[];
  dataStatus: string;
  sourceTier?: string;
  warnings?: string[];
}

export const MomentumFactorPanel: React.FC<MomentumFactorPanelProps> = ({
  assetName,
  symbol,
  momentumResult,
  atomicSignals,
  dataStatus,
  sourceTier,
  warnings = [],
}) => {
  const { locale } = useI18n();

  const { factorValue, byHorizon, crossHorizonTension, dataQualityScore } = momentumResult;
  const rawValue = factorValue.rawValue;

  const getTrendColor = (score: number | null): string => {
    if (score === null) return "text-kt-text-muted";
    return score > 0 ? "text-kt-positive-text" : score < 0 ? "text-kt-negative-text" : "text-kt-text-primary";
  };

  const getTrendBg = (score: number | null): string => {
    if (score === null) return "bg-kt-bg-surface-200 border-kt-border-panel/40";
    return score > 0
      ? "bg-kt-positive-weak/30 border-kt-positive/20"
      : score < 0
      ? "bg-kt-negative-weak/30 border-kt-negative-text/20"
      : "bg-kt-bg-surface-200 border-kt-border-panel/40";
  };

  const isUp = rawValue !== null && rawValue > 0;
  const isDown = rawValue !== null && rawValue < 0;

  return (
    <div className="w-full flex flex-col bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 overflow-hidden h-full">
      {/* Asset Header */}
      <div className="flex items-start justify-between border-b border-kt-border-panel/40 pb-3 flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-kt-text-primary leading-tight">
            {assetName}
          </h2>
          <span className="text-[10px] text-kt-text-secondary tabular-nums">
            {symbol}
          </span>
        </div>
        <FactorDataStatusBadge status={dataStatus} sourceTier={sourceTier} warnings={warnings} />
      </div>

      {/* Main Score & Diagnostic Grid */}
      <div className="flex-1 overflow-auto mt-4 pr-1 space-y-4">
        {/* Score Block */}
        <div className={`p-4 border rounded-kt-card flex items-center justify-between ${getTrendBg(rawValue)}`}>
          <div className="flex items-center gap-2.5">
            <Gauge className="w-5 h-5 text-kt-text-muted" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-kt-text-primary">
                {locale === "ko" ? "종합 모멘텀 점수" : "Aggregated Momentum"}
              </span>
              <span className="text-[10px] text-kt-text-secondary">
                {locale === "ko" ? `데이터 품질: ${dataQualityScore}%` : `Data Quality: ${dataQualityScore}%`}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {isUp && <TrendingUp className="w-4 h-4 text-kt-positive-text" />}
            {isDown && <TrendingDown className="w-4 h-4 text-kt-negative-text" />}
            <span className={`text-2xl font-black tabular-nums ${getTrendColor(rawValue)}`}>
              {rawValue !== null ? `${rawValue > 0 ? "+" : ""}${rawValue}` : "-"}
            </span>
          </div>
        </div>

        {/* Horizon Breakdowns */}
        <div className="grid grid-cols-3 gap-2">
          {/* Short */}
          <div className="bg-kt-bg-surface-200 border border-kt-border-panel/40 rounded-kt-card p-2.5 flex flex-col items-center justify-center">
            <span className="text-[10px] text-kt-text-secondary">
              {locale === "ko" ? "단기 모멘텀" : "Short-term"}
            </span>
            <span className={`text-base font-bold mt-1 tabular-nums ${getTrendColor(byHorizon.short.score)}`}>
              {byHorizon.short.score !== null ? `${byHorizon.short.score > 0 ? "+" : ""}${byHorizon.short.score}` : "-"}
            </span>
          </div>

          {/* Medium */}
          <div className="bg-kt-bg-surface-200 border border-kt-border-panel/40 rounded-kt-card p-2.5 flex flex-col items-center justify-center">
            <span className="text-[10px] text-kt-text-secondary">
              {locale === "ko" ? "중기 모멘텀" : "Medium-term"}
            </span>
            <span className={`text-base font-bold mt-1 tabular-nums ${getTrendColor(byHorizon.medium.score)}`}>
              {byHorizon.medium.score !== null ? `${byHorizon.medium.score > 0 ? "+" : ""}${byHorizon.medium.score}` : "-"}
            </span>
          </div>

          {/* Long */}
          <div className="bg-kt-bg-surface-200 border border-kt-border-panel/40 rounded-kt-card p-2.5 flex flex-col items-center justify-center">
            <span className="text-[10px] text-kt-text-secondary">
              {locale === "ko" ? "장기 모멘텀" : "Long-term"}
            </span>
            <span className={`text-base font-bold mt-1 tabular-nums ${getTrendColor(byHorizon.long.score)}`}>
              {byHorizon.long.score !== null ? `${byHorizon.long.score > 0 ? "+" : ""}${byHorizon.long.score}` : "-"}
            </span>
          </div>
        </div>

        {/* Cross-Horizon Tension Alert Card */}
        {crossHorizonTension.detected && (
          <div className="p-3 bg-kt-negative-weak border border-kt-negative-text/20 rounded-kt-card flex items-start gap-2.5 text-kt-negative-text leading-relaxed">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold">
                {locale === "ko" ? "기간별 추세 상충 감지" : "Horizon Tension Detected"}
              </span>
              <span className="text-[10px] text-kt-text-secondary leading-snug">
                {locale === "ko"
                  ? "단기 추세와 장기 추세의 방향이 반대로 엇갈리고 있어 변동성 확대 혹은 추세 변곡점일 가능성이 높습니다."
                  : crossHorizonTension.description}
              </span>
            </div>
          </div>
        )}

        {/* Details Title */}
        <div className="pt-2 flex-shrink-0">
          <h3 className="text-xs font-semibold text-kt-text-primary">
            {locale === "ko" ? "원자 수준 기술적 분석 (8종)" : "Atomic Technical Signals (8)"}
          </h3>
        </div>

        {/* Embedded Atomic List */}
        <TechnicalSignalList atomicSignals={atomicSignals} />
      </div>
    </div>
  );
};
