"use client";

import React, { useState } from "react";
import { BacktestSelectedPosition, OosPeriodSummary } from "@/domain/backtest/backtest-result";
import { useI18n } from "@/i18n/use-i18n";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SelectedPositionsTableProps {
  oosSummaries: OosPeriodSummary[];
}

function formatReturn(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function PositionRow({
  position,
  locale,
}: {
  position: BacktestSelectedPosition;
  locale: string;
}) {
  return (
    <tr className="hover:bg-kt-bg-overlay-300/40 transition-colors">
      <td className="px-3 py-2 font-mono text-kt-text-primary">{position.rank}</td>
      <td className="px-3 py-2 font-mono text-kt-text-primary">{position.symbol}</td>
      <td className="px-3 py-2 text-right font-mono text-kt-text-secondary">
        {position.signalScore.toFixed(2)}
      </td>
      <td className="px-3 py-2 text-right font-mono text-kt-text-muted">
        {(position.weight * 100).toFixed(1)}%
      </td>
      <td className="px-3 py-2 font-mono text-kt-text-muted whitespace-nowrap">
        {position.entryDate}
        {position.exitDate ? ` → ${position.exitDate}` : ""}
      </td>
      <td className="px-3 py-2 text-right font-mono text-kt-text-secondary">
        {formatReturn(position.netReturn)}
      </td>
      <td className="px-3 py-2 text-right font-mono text-kt-text-muted">
        {position.entryCostBps + position.exitCostBps} bps
      </td>
      <td className="px-3 py-2 text-[10px] text-kt-text-muted">
        {position.warnings.length > 0
          ? position.warnings.join(", ")
          : locale === "ko"
          ? "없음"
          : "none"}
      </td>
    </tr>
  );
}

export const SelectedPositionsTable: React.FC<SelectedPositionsTableProps> = ({
  oosSummaries,
}) => {
  const { locale } = useI18n();
  const [expandedWindows, setExpandedWindows] = useState<Set<number>>(() => {
    const firstWithPositions = oosSummaries.find((s) => s.selectedPositions.length > 0);
    return new Set(firstWithPositions ? [firstWithPositions.windowIndex] : []);
  });

  const windowsWithPositions = oosSummaries.filter((s) => s.selectedPositions.length > 0);
  const totalSelected = oosSummaries.reduce((sum, s) => sum + s.selectedPositions.length, 0);

  if (totalSelected === 0) {
    return (
      <div className="border border-kt-border-panel rounded-kt-card p-4 bg-kt-bg-surface-100 text-center text-xs text-kt-text-muted">
        {locale === "ko"
          ? "선택된 포지션 기록이 없습니다."
          : "No selected position records available."}
      </div>
    );
  }

  const toggleWindow = (windowIndex: number) => {
    setExpandedWindows((prev) => {
      const next = new Set(prev);
      if (next.has(windowIndex)) {
        next.delete(windowIndex);
      } else {
        next.add(windowIndex);
      }
      return next;
    });
  };

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card overflow-hidden">
      <div className="px-4 py-3 border-b border-kt-border-panel flex items-center justify-between">
        <span className="text-xs font-semibold text-kt-text-primary">
          {locale === "ko" ? "선택 포지션 상세 (Signal Postmortem 입력)" : "Selected Positions (Signal Postmortem Input)"}
        </span>
        <span className="text-[10px] font-mono text-kt-text-muted">
          {locale === "ko" ? "총" : "Total"}: {totalSelected}
        </span>
      </div>

      <div className="divide-y divide-kt-border-panel">
        {windowsWithPositions.map((summary) => {
          const expanded = expandedWindows.has(summary.windowIndex);
          return (
            <div key={summary.windowIndex}>
              <button
                type="button"
                onClick={() => toggleWindow(summary.windowIndex)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-kt-bg-overlay-300/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-kt-text-muted" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-kt-text-muted" />
                  )}
                  <span className="text-xs font-mono text-kt-text-primary">
                    W{summary.windowIndex + 1}
                  </span>
                  <span className="text-[10px] text-kt-text-muted">
                    {summary.testStart} ~ {summary.testEnd}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-kt-text-muted">
                  {summary.selectedPositions.length}{" "}
                  {locale === "ko" ? "종목" : "positions"}
                </span>
              </button>

              {expanded && (
                <div className="overflow-x-auto border-t border-kt-border-panel/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-kt-border-panel text-kt-text-muted bg-kt-bg-overlay-300/20">
                        <th className="px-3 py-2 font-medium">Rank</th>
                        <th className="px-3 py-2 font-medium">
                          {locale === "ko" ? "종목" : "Symbol"}
                        </th>
                        <th className="px-3 py-2 font-medium text-right">Score</th>
                        <th className="px-3 py-2 font-medium text-right">
                          {locale === "ko" ? "비중" : "Weight"}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {locale === "ko" ? "진입/청산" : "Entry/Exit"}
                        </th>
                        <th className="px-3 py-2 font-medium text-right">
                          {locale === "ko" ? "순수익률" : "Net Return"}
                        </th>
                        <th className="px-3 py-2 font-medium text-right">
                          {locale === "ko" ? "비용" : "Cost"}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {locale === "ko" ? "경고" : "Warnings"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kt-border-panel">
                      {summary.selectedPositions.map((position) => (
                        <PositionRow
                          key={`${summary.windowIndex}-${position.assetId}`}
                          position={position}
                          locale={locale}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
