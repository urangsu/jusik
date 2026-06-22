"use client";

import React from "react";
import { StrategyTrialRecord } from "@/domain/strategy/strategy-trial-record";
import { useI18n } from "@/i18n/use-i18n";
import { MetricCell } from "../ui/MetricCell";

interface StrategyTrialTableProps {
  trials: StrategyTrialRecord[];
  onSelectTrial?: (trial: StrategyTrialRecord) => void;
  selectedTrialId?: string | null;
}

export const StrategyTrialTable: React.FC<StrategyTrialTableProps> = ({
  trials,
  onSelectTrial,
  selectedTrialId,
}) => {
  const { locale } = useI18n();

  const formatPct = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return `${(num * 100).toFixed(2)}%`;
  };

  const formatDecimal = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return num.toFixed(3);
  };

  if (trials.length === 0) {
    return (
      <div className="border border-kt-border-panel rounded-kt-card p-6 bg-kt-bg-surface-100 text-center text-xs text-kt-text-muted">
        {locale === "ko" ? "등록된 전략 연구 기록이 없습니다." : "No strategy trial records found."}
      </div>
    );
  }

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card overflow-hidden">
      <div className="px-4 py-3 border-b border-kt-border-panel flex items-center justify-between bg-kt-bg-surface-200">
        <span className="text-xs font-semibold text-kt-text-primary">
          {locale === "ko" ? "전략 연구 기록 목록" : "Strategy Trial Records"}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-kt-border-panel text-kt-text-muted bg-kt-bg-overlay-300/20">
              <th className="px-4 py-2 font-medium">{locale === "ko" ? "전략 ID" : "Strategy ID"}</th>
              <th className="px-4 py-2 font-medium">{locale === "ko" ? "유니버스" : "Universe"}</th>
              <th className="px-4 py-2 font-medium">{locale === "ko" ? "변형" : "Variant"}</th>
              <th className="px-4 py-2 font-medium">{locale === "ko" ? "상태" : "Status"}</th>
              <th className="px-4 py-2 font-medium">{locale === "ko" ? "유효성" : "Validity"}</th>
              <th className="px-4 py-2 font-medium text-right">{locale === "ko" ? "OOS 수익률" : "OOS Return"}</th>
              <th className="px-4 py-2 font-medium text-right">{locale === "ko" ? "평균 IC" : "Mean IC"}</th>
              <th className="px-4 py-2 font-medium text-right">{locale === "ko" ? "최대 낙폭" : "MDD"}</th>
              <th className="px-4 py-2 font-medium text-right">{locale === "ko" ? "교체율" : "Turnover"}</th>
              <th className="px-4 py-2 font-medium text-center">{locale === "ko" ? "편향 경고" : "Bias Warn"}</th>
              <th className="px-4 py-2 font-medium text-center">{locale === "ko" ? "사후검토" : "Postmortem"}</th>
              <th className="px-4 py-2 font-medium">{locale === "ko" ? "생성일" : "Created At"}</th>
            </tr>
          </thead>
          <tbody>
            {trials.map((t) => {
              const isSelected = selectedTrialId === t.id;
              const oosReturn = t.observedMetrics.oosReturn;
              const spearmanIc = t.observedMetrics.spearmanIc;
              const maxDrawdown = t.observedMetrics.maxDrawdown;
              const turnover = t.observedMetrics.turnover;

              return (
                <tr
                  key={t.id}
                  onClick={() => onSelectTrial?.(t)}
                  className={`border-b border-kt-border-panel/40 cursor-pointer transition-colors ${
                    isSelected ? "bg-kt-bg-overlay-300/40" : "hover:bg-kt-bg-overlay-300/10"
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-kt-text-primary">{t.strategyId}</td>
                  <td className="px-4 py-2.5 text-kt-text-muted">{t.universeId}</td>
                  <td className="px-4 py-2.5 text-kt-text-muted">{t.variantId}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                        t.validationStatus === "rejected"
                          ? "bg-kt-negative-text/10 text-kt-negative-text border border-kt-negative-text/20"
                          : t.validationStatus === "invalid"
                          ? "bg-kt-text-muted/10 text-kt-text-muted border border-kt-text-muted/20"
                          : "bg-kt-positive-text/10 text-kt-positive-text border border-kt-positive-text/20"
                      }`}
                    >
                      {t.validationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-medium text-kt-text-muted">
                      {t.validityLevel || "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    <MetricCell
                      value={oosReturn}
                      status={oosReturn === null ? "insufficient_data" : "cached"}
                      formatter={formatPct}
                      changeType={oosReturn !== null ? (oosReturn > 0 ? "positive" : oosReturn < 0 ? "negative" : "neutral") : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    <MetricCell
                      value={spearmanIc}
                      status={spearmanIc === null ? "insufficient_data" : "cached"}
                      formatter={formatDecimal}
                      changeType={spearmanIc !== null ? (spearmanIc > 0 ? "positive" : spearmanIc < 0 ? "negative" : "neutral") : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    <MetricCell
                      value={maxDrawdown}
                      status={maxDrawdown === null ? "insufficient_data" : "cached"}
                      formatter={formatPct}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    <MetricCell
                      value={turnover}
                      status={turnover === null ? "insufficient_data" : "cached"}
                      formatter={formatPct}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-center font-medium text-kt-text-muted">
                    {t.biasWarnings.length}
                  </td>
                  <td className="px-4 py-2.5 text-center font-medium text-kt-text-muted">
                    {t.postmortemSummary?.signalPostmortemCount || 0}
                  </td>
                  <td className="px-4 py-2.5 text-kt-text-muted">
                    {new Date(t.createdAt).toLocaleDateString()}
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
