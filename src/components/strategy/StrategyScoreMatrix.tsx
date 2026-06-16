import React from "react";
import { StrategyViewScore } from "@/domain/strategy/strategy-view";
import { MetricCell } from "../ui/MetricCell";
import { StatusBadge } from "../ui/StatusBadge";

const SIGNAL_LABEL: Record<StrategyViewScore["signal"], string> = {
  positive_watch: "관찰",
  neutral: "중립",
  caution: "주의",
  risk: "위험",
  insufficient_data: "데이터 부족",
};

const CONFIDENCE_LABEL: Record<StrategyViewScore["confidence"], string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  none: "없음",
};

export const StrategyScoreMatrix: React.FC<{ views: StrategyViewScore[] }> = ({ views }) => {
  return (
    <div className="overflow-hidden rounded-kt-card border border-kt-border-panel">
      <div className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_0.9fr_1.2fr_1.2fr] gap-3 border-b border-kt-border-panel bg-kt-bg-overlay-300/50 px-3 py-2 text-[11px] font-semibold text-kt-text-muted">
        <span>전략명</span>
        <span>점수</span>
        <span>방향</span>
        <span>신뢰도</span>
        <span>상태</span>
        <span>상승 요인</span>
        <span>위험 요인</span>
      </div>
      {views.map((view) => (
        <div
          key={view.strategyId}
          className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_0.9fr_1.2fr_1.2fr] gap-3 border-b border-kt-border-panel/60 px-3 py-3 text-xs last:border-b-0"
        >
          <span className="font-semibold text-kt-text-primary">{view.displayName}</span>
          <MetricCell value={view.score} status={view.status} />
          <span className="text-kt-text-secondary">{SIGNAL_LABEL[view.signal]}</span>
          <span className="text-kt-text-secondary">{CONFIDENCE_LABEL[view.confidence]}</span>
          <StatusBadge status={view.status} />
          <span className="text-kt-text-muted">{view.bullishFactors[0] ?? "데이터 부족"}</span>
          <span className="text-kt-text-muted">{view.bearishFactors[0] ?? "데이터 부족"}</span>
        </div>
      ))}
    </div>
  );
};
