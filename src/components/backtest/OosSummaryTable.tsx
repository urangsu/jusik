"use client";

import React from "react";
import { OosPeriodSummary } from "@/domain/backtest/backtest-result";
import { useI18n } from "@/i18n/use-i18n";
import { MetricCell } from "../ui/MetricCell";

interface OosSummaryTableProps {
  oosSummaries: OosPeriodSummary[];
  hasVeto?: boolean;
}

export const OosSummaryTable: React.FC<OosSummaryTableProps> = ({
  oosSummaries,
  hasVeto = false,
}) => {
  const { locale } = useI18n();

  if (hasVeto || oosSummaries.length === 0) {
    return (
      <div className="border border-kt-border-panel rounded-kt-card p-4 bg-kt-bg-surface-100 text-center text-xs text-kt-text-muted">
        {locale === "ko"
          ? "검증 조건 미달로 인해 구간 성과 상세 정보가 노출되지 않습니다."
          : "Period performance details are hidden due to validation failure."}
      </div>
    );
  }

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card overflow-hidden">
      <div className="px-4 py-3 border-b border-kt-border-panel flex items-center justify-between">
        <span className="text-xs font-semibold text-kt-text-primary">
          {locale === "ko" ? "테스트 구간별 상세 결과 (OOS)" : "Detailed OOS Period Results"}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-kt-border-panel text-kt-text-muted bg-kt-bg-overlay-300/20">
              <th className="px-4 py-2 font-medium">
                {locale === "ko" ? "구간" : "Period"}
              </th>
              <th className="px-4 py-2 font-medium">
                {locale === "ko" ? "평가 기간 (OOS)" : "Evaluation Period"}
              </th>
              <th className="px-4 py-2 font-medium text-right">
                {locale === "ko" ? "자산 수" : "Assets"}
              </th>
              <th className="px-4 py-2 font-medium text-right">
                {locale === "ko" ? "Rank IC" : "Rank IC"}
              </th>
              <th className="px-4 py-2 font-medium text-right">
                {locale === "ko" ? "IC 페어" : "IC Pairs"}
              </th>
              <th className="px-4 py-2 font-medium text-right">
                {locale === "ko" ? "Hit Rate" : "Hit Rate"}
              </th>
              <th className="px-4 py-2 font-medium text-right">
                {locale === "ko" ? "Long-only 수익률" : "Long-only Return"}
              </th>
              <th className="px-4 py-2 font-medium text-right">
                {locale === "ko" ? "벤치마크" : "Benchmark"}
              </th>
              <th className="px-4 py-2 font-medium text-right">
                {locale === "ko" ? "초과 수익" : "Excess"}
              </th>
              <th className="px-4 py-2 font-medium text-right">
                {locale === "ko" ? "교체율" : "Turnover"}
              </th>
              <th className="px-4 py-2 font-medium text-center">
                {locale === "ko" ? "데이터 품질" : "Data Quality"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kt-border-panel">
            {oosSummaries.map((summary) => {
              const lowReliability = summary.dataQualityScore < 70;

              return (
                <tr
                  key={summary.windowIndex}
                  className="hover:bg-kt-bg-overlay-300/40 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-kt-text-primary">
                    W{summary.windowIndex + 1}
                  </td>
                  <td className="px-4 py-3 font-mono text-kt-text-secondary whitespace-nowrap">
                    {summary.testStart} ~ {summary.testEnd}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-kt-text-secondary">
                    {summary.nAssets}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MetricCell
                      value={summary.rankIc}
                      status={summary.rankIc === null ? "insufficient_data" : "cached"}
                      formatter={(v) => (Number(v) >= 0 ? "+" : "") + Number(v).toFixed(4)}
                      changeType={
                        summary.rankIc === null
                          ? "neutral"
                          : summary.rankIc > 0
                          ? "positive"
                          : summary.rankIc < 0
                          ? "negative"
                          : "neutral"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-kt-text-muted">
                    {summary.validIcPairCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MetricCell
                      value={summary.hitRate}
                      status={summary.hitRate === null ? "insufficient_data" : "cached"}
                      formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MetricCell
                      value={summary.longOnlyReturn}
                      status={summary.longOnlyReturn === null ? "insufficient_data" : "cached"}
                      formatter={(v) => `${(Number(v) * 100).toFixed(2)}%`}
                      changeType={
                        summary.longOnlyReturn === null
                          ? "neutral"
                          : summary.longOnlyReturn > 0
                          ? "positive"
                          : summary.longOnlyReturn < 0
                          ? "negative"
                          : "neutral"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MetricCell
                      value={summary.benchmarkReturn}
                      status={summary.benchmarkReturn === null ? "insufficient_data" : "cached"}
                      formatter={(v) => `${(Number(v) * 100).toFixed(2)}%`}
                      changeType={
                        summary.benchmarkReturn === null
                          ? "neutral"
                          : summary.benchmarkReturn > 0
                          ? "positive"
                          : summary.benchmarkReturn < 0
                          ? "negative"
                          : "neutral"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <MetricCell
                      value={summary.excessReturn}
                      status={summary.excessReturn === null ? "insufficient_data" : "cached"}
                      formatter={(v) => (Number(v) >= 0 ? "+" : "") + `${(Number(v) * 100).toFixed(2)}%`}
                      changeType={
                        summary.excessReturn === null
                          ? "neutral"
                          : summary.excessReturn > 0
                          ? "positive"
                          : summary.excessReturn < 0
                          ? "negative"
                          : "neutral"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-kt-text-muted">
                    {summary.turnover !== null
                      ? `${(summary.turnover * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={`font-medium font-mono ${
                          lowReliability ? "text-kt-negative-text" : "text-kt-text-primary"
                        }`}
                      >
                        {summary.dataQualityScore}%
                      </span>
                      {lowReliability && (
                        <span className="text-[9px] text-kt-negative-text scale-90 origin-center">
                          {locale === "ko" ? "(신뢰도 낮음)" : "(Low Quality)"}
                        </span>
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
