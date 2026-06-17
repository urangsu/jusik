import React from "react";
import { AtomicSignal } from "@/domain/factors/atomic-signal";
import { TechnicalSignalBadge } from "./TechnicalSignalBadge";
import { useI18n } from "@/i18n/use-i18n";

interface TechnicalSignalListProps {
  atomicSignals: AtomicSignal[];
}

export const TechnicalSignalList: React.FC<TechnicalSignalListProps> = ({ atomicSignals }) => {
  const { locale } = useI18n();

  const namesKo: Record<string, string> = {
    momentum_ichimoku: "일목균형표 추세 강도",
    momentum_darvas: "다윈 박스 경계 진단",
    momentum_turtle: "터틀 채널 가격 돌파",
    momentum_weinstein: "와인스타인 4단계 분석",
    momentum_ma_slope: "이동평균선 기울기",
    momentum_return: "과거 수익률 모멘텀",
    momentum_volatility: "변동성 안정도 점수",
    momentum_volume: "거래량 분출 지수",
  };

  const namesEn: Record<string, string> = {
    momentum_ichimoku: "Ichimoku Cloud Trend",
    momentum_darvas: "Darvas Box Boundary",
    momentum_turtle: "Turtle Channel Breakout",
    momentum_weinstein: "Weinstein 4-Stage",
    momentum_ma_slope: "Moving Average Slope",
    momentum_return: "Historical Returns",
    momentum_volatility: "Volatility Stability Score",
    momentum_volume: "Volume Intensity Index",
  };

  const horizonKo: Record<string, string> = {
    short: "단기",
    medium: "중기",
    long: "장기",
  };

  const horizonEn: Record<string, string> = {
    short: "Short",
    medium: "Medium",
    long: "Long",
  };

  const getMetadataText = (sig: AtomicSignal): string => {
    const meta = sig.metadata || {};
    if (locale === "ko") {
      switch (sig.factorId) {
        case "momentum_ichimoku":
          const posMap: Record<string, string> = {
            above: "구름대 위",
            below: "구름대 아래",
            inside: "구름대 내부",
            insufficient_data: "데이터 부족",
          };
          const crossMap: Record<string, string> = {
            bullish_cross: "전환/기준선 골든크로스",
            bearish_cross: "전환/기준선 데드크로스",
            none: "교차 없음",
          };
          return `위치: ${posMap[meta.cloudPosition] || "-"}, 교차: ${crossMap[meta.tkCross] || "-"}`;
        
        case "momentum_darvas":
          const dBoxMap: Record<string, string> = {
            up: "상향 돌파",
            down: "하향 돌파",
            none: "박스 내부 진동",
          };
          return `돌파: ${dBoxMap[meta.breakout] || "-"}, 박스 유지일: ${meta.boxAge ?? 0}일`;
        
        case "momentum_turtle":
          const tEntryMap: Record<string, string> = {
            long: "상향 돌파",
            short: "하향 돌파",
            none: "채널 내부",
          };
          const tExitMap: Record<string, string> = {
            long_exit: "상승 이탈",
            short_exit: "하락 이탈",
            none: "신호 없음",
          };
          return `돌파: ${tEntryMap[meta.entryBreakout] || "-"}, 청산 신호: ${tExitMap[meta.exitBreakout] || "-"}`;
        
        case "momentum_weinstein":
          const stageMap: Record<string, string> = {
            stage_1_base: "1단계 (바닥권 박스)",
            stage_2_uptrend: "2단계 (상승 국면)",
            stage_3_top: "3단계 (최상단 혼조)",
            stage_4_downtrend: "4단계 (하락 국면)",
            insufficient_data: "진단 불가",
          };
          return `단계: ${stageMap[meta.stage] || "-"}`;
        
        case "momentum_ma_slope":
          return meta.slope5d !== undefined && meta.slope5d !== null
            ? `5일 기울기: ${(meta.slope5d * 100).toFixed(2)}%`
            : "측정 불가";
        
        case "momentum_return":
          const r20 = meta.return20d !== undefined && meta.return20d !== null ? `${(meta.return20d * 100).toFixed(1)}%` : "-";
          const r60 = meta.return60d !== undefined && meta.return60d !== null ? `${(meta.return60d * 100).toFixed(1)}%` : "-";
          return `20일: ${r20}, 60일: ${r60}`;
        
        case "momentum_volatility":
          return meta.zScore !== undefined && meta.zScore !== null
            ? `변동성 z-score: ${meta.zScore.toFixed(2)}`
            : "측정 불가";
        
        case "momentum_volume":
          return meta.zScore !== undefined && meta.zScore !== null
            ? `거래량 z-score: ${meta.zScore.toFixed(2)}`
            : "측정 불가";
        
        default:
          return "";
      }
    } else {
      // English mode
      switch (sig.factorId) {
        case "momentum_ichimoku":
          return `Pos: ${meta.cloudPosition || "-"}, Cross: ${meta.tkCross || "-"}`;
        case "momentum_darvas":
          return `Breakout: ${meta.breakout || "-"}, Age: ${meta.boxAge ?? 0}d`;
        case "momentum_turtle":
          return `Entry: ${meta.entryBreakout || "-"}, Exit: ${meta.exitBreakout || "-"}`;
        case "momentum_weinstein":
          return `Stage: ${meta.stage?.replace(/_/g, " ") || "-"}`;
        case "momentum_ma_slope":
          return meta.slope5d !== undefined && meta.slope5d !== null
            ? `5d Slope: ${(meta.slope5d * 100).toFixed(2)}%`
            : "N/A";
        case "momentum_return":
          const r20e = meta.return20d !== undefined && meta.return20d !== null ? `${(meta.return20d * 100).toFixed(1)}%` : "-";
          const r60e = meta.return60d !== undefined && meta.return60d !== null ? `${(meta.return60d * 100).toFixed(1)}%` : "-";
          return `20d: ${r20e}, 60d: ${r60e}`;
        case "momentum_volatility":
          return meta.zScore !== undefined && meta.zScore !== null
            ? `Vol Z-score: ${meta.zScore.toFixed(2)}`
            : "N/A";
        case "momentum_volume":
          return meta.zScore !== undefined && meta.zScore !== null
            ? `Vol Z-score: ${meta.zScore.toFixed(2)}`
            : "N/A";
        default:
          return "";
      }
    }
  };

  return (
    <div className="w-full flex flex-col gap-2 mt-2">
      {atomicSignals.map((sig) => {
        const title = locale === "ko" ? namesKo[sig.factorId] : namesEn[sig.factorId];
        const hz = locale === "ko" ? horizonKo[sig.horizon] : horizonEn[sig.horizon];
        const detail = getMetadataText(sig);

        return (
          <div
            key={sig.factorId}
            className="flex items-center justify-between p-2.5 bg-kt-bg-surface-200 border border-kt-border-panel/40 rounded-kt-card transition-colors hover:border-kt-border-panel"
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-kt-text-primary">
                  {title || sig.factorId}
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-kt-bg-surface-100 text-kt-text-muted border border-kt-border-panel/30">
                  {hz}
                </span>
              </div>
              <span className="text-[10px] text-kt-text-secondary leading-none">
                {detail}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-kt-text-primary tabular-nums">
                {sig.score !== null ? `${sig.score > 0 ? "+" : ""}${sig.score}` : "-"}
              </span>
              <TechnicalSignalBadge label={sig.signalLabel} score={sig.score} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
