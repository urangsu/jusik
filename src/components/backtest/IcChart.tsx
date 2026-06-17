"use client";

import React from "react";
import { OosPeriodSummary } from "@/domain/backtest/backtest-result";
import { useI18n } from "@/i18n/use-i18n";

interface IcChartProps {
  oosSummaries: OosPeriodSummary[];
  hasVeto?: boolean;
}

export const IcChart: React.FC<IcChartProps> = ({ oosSummaries, hasVeto = false }) => {
  const { locale } = useI18n();

  if (hasVeto || oosSummaries.length === 0) {
    return (
      <div className="w-full h-48 border border-dashed border-kt-border-panel/60 rounded-kt-card bg-kt-bg-overlay-300/20 flex flex-col items-center justify-center p-6 text-center text-xs text-kt-text-muted">
        <span>{locale === "ko" ? "결과 신뢰도 제한으로 차트가 비활성화되었습니다." : "Chart disabled due to result reliability limits."}</span>
      </div>
    );
  }

  // Calculate drawing dimensions
  const width = 600;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // We scale IC from -0.5 to 0.5. Anything beyond is clamped.
  const icMin = -0.5;
  const icMax = 0.5;
  const icRange = icMax - icMin;

  const getY = (val: number | null) => {
    if (val === null) return chartHeight / 2 + paddingTop;
    const clamped = Math.max(icMin, Math.min(icMax, val));
    const ratio = (clamped - icMin) / icRange;
    // Note: SVG Y is 0 at top, so we invert
    return height - paddingBottom - ratio * chartHeight;
  };

  const zeroY = getY(0);

  const barWidth = Math.max(8, Math.min(24, (chartWidth / oosSummaries.length) * 0.6));
  const barSpacing = (chartWidth - barWidth * oosSummaries.length) / (oosSummaries.length + 1);

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-kt-text-primary">
          {locale === "ko" ? "구간별 정보 계수 (Spearman Rank IC)" : "Information Coefficient (Spearman Rank IC) per Period"}
        </span>
        <span className="text-[10px] text-kt-text-muted">
          {locale === "ko" ? "범위: -0.5 ~ +0.5 (제한)" : "Range: -0.5 to +0.5 (clamped)"}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[500px] h-auto text-kt-text-muted select-none"
        >
          {/* Grid lines */}
          <line
            x1={paddingLeft}
            y1={getY(0.5)}
            x2={width - paddingRight}
            y2={getY(0.5)}
            stroke="var(--kt-border-panel)"
            strokeDasharray="2 2"
          />
          <line
            x1={paddingLeft}
            y1={getY(0.25)}
            x2={width - paddingRight}
            y2={getY(0.25)}
            stroke="var(--kt-border-panel)"
            strokeDasharray="2 2"
          />
          <line
            x1={paddingLeft}
            y1={zeroY}
            x2={width - paddingRight}
            y2={zeroY}
            stroke="rgba(255, 240, 240, 0.25)"
            strokeWidth="1.2"
          />
          <line
            x1={paddingLeft}
            y1={getY(-0.25)}
            x2={width - paddingRight}
            y2={getY(-0.25)}
            stroke="var(--kt-border-panel)"
            strokeDasharray="2 2"
          />
          <line
            x1={paddingLeft}
            y1={getY(-0.5)}
            x2={width - paddingRight}
            y2={getY(-0.5)}
            stroke="var(--kt-border-panel)"
            strokeDasharray="2 2"
          />

          {/* Y Axis Labels */}
          <text x={paddingLeft - 8} y={getY(0.5) + 3} textAnchor="end" className="text-[9px] fill-current">
            +0.5
          </text>
          <text x={paddingLeft - 8} y={getY(0.25) + 3} textAnchor="end" className="text-[9px] fill-current">
            +0.25
          </text>
          <text x={paddingLeft - 8} y={zeroY + 3} textAnchor="end" className="text-[9px] fill-current font-bold">
            0.0
          </text>
          <text x={paddingLeft - 8} y={getY(-0.25) + 3} textAnchor="end" className="text-[9px] fill-current">
            -0.25
          </text>
          <text x={paddingLeft - 8} y={getY(-0.5) + 3} textAnchor="end" className="text-[9px] fill-current">
            -0.5
          </text>

          {/* Bars */}
          {oosSummaries.map((summary, index) => {
            const icVal = summary.ic;
            if (icVal === null) return null;

            const barHeight = Math.abs(getY(icVal) - zeroY);
            const barX = paddingLeft + barSpacing + index * (barWidth + barSpacing);
            const barY = icVal >= 0 ? zeroY - barHeight : zeroY;

            // Semantic colors from variables
            const barFill = icVal >= 0 ? "var(--kt-positive-text)" : "var(--kt-negative-text)";

            // Show window index underneath (e.g. W1, W2, ...)
            const labelX = barX + barWidth / 2;
            const labelY = height - 10;

            return (
              <g key={summary.windowIndex} className="group cursor-help">
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={Math.max(1, barHeight)}
                  fill={barFill}
                  rx={2}
                  className="opacity-80 hover:opacity-100 transition-opacity"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  className="text-[9px] fill-kt-text-secondary"
                >
                  W{summary.windowIndex + 1}
                </text>
                {/* Simple SVG tooltip overlay/title */}
                <title>
                  {locale === "ko"
                    ? `구간 ${summary.windowIndex + 1}: ${summary.testStart} ~ ${summary.testEnd}\nIC: ${icVal.toFixed(4)}\n자산 수: ${summary.nAssets}`
                    : `Period ${summary.windowIndex + 1}: ${summary.testStart} to ${summary.testEnd}\nIC: ${icVal.toFixed(4)}\nAssets: ${summary.nAssets}`}
                </title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
