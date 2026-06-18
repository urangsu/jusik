"use client";

import React, { useState } from "react";
import { useI18n } from "@/i18n/use-i18n";
import { BacktestResult, BacktestValidityReport } from "@/domain/backtest/backtest-result";
import { BacktestWarningBanner } from "./BacktestWarningBanner";
import { BacktestRunPanel } from "./BacktestRunPanel";
import { BacktestVetoReasons } from "./BacktestVetoReasons";
import { BacktestMetricCard } from "./BacktestMetricCard";
import { IcChart } from "./IcChart";
import { OosSummaryTable } from "./OosSummaryTable";
import { BarChart3, Loader2, BookOpen } from "lucide-react";
import { StrategyResearchPanel } from "@/components/strategy/StrategyResearchPanel";

// ─── Validity Badge ───────────────────────────────────────────────────────────

const VALIDITY_LEVEL_STYLES: Record<
  BacktestValidityReport["level"],
  { border: string; bg: string; badge: string; text: string }
> = {
  invalid: {
    border: "border-kt-negative-text/40",
    bg: "bg-kt-bg-surface-100",
    badge: "bg-kt-negative-text/10 text-kt-negative-text border border-kt-negative-text/30",
    text: "text-kt-negative-text",
  },
  insufficient_data: {
    border: "border-kt-text-muted/30",
    bg: "bg-kt-bg-surface-100",
    badge: "bg-kt-bg-overlay-300/30 text-kt-text-muted border border-kt-text-muted/30",
    text: "text-kt-text-muted",
  },
  functional_check_only: {
    border: "border-kt-text-secondary/30",
    bg: "bg-kt-bg-surface-100",
    badge: "bg-kt-bg-overlay-300/30 text-kt-text-secondary border border-kt-text-secondary/30",
    text: "text-kt-text-secondary",
  },
  research_candidate: {
    border: "border-kt-positive-text/40",
    bg: "bg-kt-bg-surface-100",
    badge: "bg-kt-positive-text/10 text-kt-positive-text border border-kt-positive-text/30",
    text: "text-kt-positive-text",
  },
};

const VALIDITY_LEVEL_LABEL: Record<
  BacktestValidityReport["level"],
  { ko: string; en: string }
> = {
  invalid: { ko: "무효", en: "INVALID" },
  insufficient_data: { ko: "데이터 부족", en: "INSUFFICIENT DATA" },
  functional_check_only: { ko: "기능 검증용", en: "FUNCTIONAL CHECK ONLY" },
  research_candidate: { ko: "연구 후보", en: "RESEARCH CANDIDATE" },
};

interface ValidityReportBadgeProps {
  validityReport: BacktestValidityReport;
  locale: string;
}

const ValidityReportBadge: React.FC<ValidityReportBadgeProps> = ({ validityReport, locale }) => {
  const styles = VALIDITY_LEVEL_STYLES[validityReport.level];
  const label = VALIDITY_LEVEL_LABEL[validityReport.level];
  return (
    <div className={`border ${styles.border} ${styles.bg} rounded-kt-card p-3 flex flex-col gap-1.5`}>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono tracking-wider ${styles.badge}`}>
          {locale === "ko" ? label.ko : label.en}
        </span>
        <span className={`text-xs ${styles.text}`}>{validityReport.messageKo}</span>
      </div>
      {validityReport.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {validityReport.reasons.map((r) => (
            <span
              key={r}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono text-kt-text-muted border border-kt-border-panel bg-kt-bg-overlay-300/20"
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const BacktestWorkspace: React.FC = () => {
  const { locale } = useI18n();
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleResult = (newResult: BacktestResult | null) => {
    setResult(newResult);
  };

  const handleRunningChange = (running: boolean) => {
    setIsRunning(running);
  };

  // Determine if there are veto reasons that block showing the performance results
  const hasVeto = result ? result.vetoReasons.length > 0 : false;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Warning Banner */}
      <BacktestWarningBanner />

      <div className="px-4 flex flex-col gap-4 max-w-5xl mx-auto w-full pb-8">
        {/* Setup Parameters Panel */}
        <BacktestRunPanel onResult={handleResult} onRunningChange={handleRunningChange} />

        {/* Results Area */}
        {isRunning ? (
          <div className="border border-kt-border-panel rounded-kt-card p-12 bg-kt-bg-surface-100 flex flex-col items-center justify-center text-center gap-4">
            <Loader2 className="w-8 h-8 text-kt-positive-text animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-kt-text-primary">
                {locale === "ko" ? "시뮬레이션 연산 수행 중" : "Running Backtest Simulation"}
              </span>
              <p className="text-xs text-kt-text-muted max-w-sm">
                {locale === "ko"
                  ? "지정된 기간 동안 Walk-forward 창을 생성하고, 모멘텀 기술적 팩터를 로드하여 최적 포트폴리오의 OOS 성과를 계산하고 있습니다."
                  : "Generating walk-forward windows, loading technical factor values, and calculating OOS portfolio returns over the specified period."}
              </p>
            </div>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-4">
            {/* Run Metadata Banner */}
            <div className="border border-kt-border-panel rounded-kt-card p-4 bg-kt-bg-surface-100/60 flex items-center justify-between flex-wrap gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-kt-text-primary font-mono">
                  ID: {result.runId}
                </span>
                <span className="text-[10px] text-kt-text-muted">
                  {locale === "ko" ? "실행 시각: " : "Created: "}
                  {new Date(result.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-kt-text-muted">{locale === "ko" ? "자산 유니버스" : "Universe"}</span>
                  <span className="font-semibold text-kt-text-primary">{result.universeId}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-kt-text-muted">{locale === "ko" ? "백테스트 상태" : "Status"}</span>
                  <span
                    className={`font-semibold uppercase ${
                      result.status === "completed"
                        ? "text-kt-positive-text"
                        : "text-kt-text-muted"
                    }`}
                  >
                    {result.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Veto Reasons & Warnings */}
            <BacktestVetoReasons
              vetoReasons={result.vetoReasons}
              warnings={result.warnings}
            />

            {/* Validity Report Badge */}
            <ValidityReportBadge validityReport={result.validityReport} locale={locale} />

            {/* Summary Metrics Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <BacktestMetricCard
                label={locale === "ko" ? "평균 정보 계수 (Mean IC)" : "Mean IC"}
                value={result.aggregated.icMean}
                status={result.status === "completed" ? "cached" : "error"}
                formatter={(v) => (v >= 0 ? "+" : "") + v.toFixed(4)}
                changeType={
                  result.aggregated.icMean === null
                    ? "neutral"
                    : result.aggregated.icMean > 0
                    ? "positive"
                    : result.aggregated.icMean < 0
                    ? "negative"
                    : "neutral"
                }
                description={locale === "ko" ? "구간별 rank IC의 산술평균" : "Arithmetic mean of rank ICs"}
                hasVeto={hasVeto}
              />

              <BacktestMetricCard
                label={locale === "ko" ? "정보 비율 (IC IR)" : "IC IR"}
                value={result.aggregated.icir}
                status={result.status === "completed" ? "cached" : "error"}
                formatter={(v) => (v >= 0 ? "+" : "") + v.toFixed(4)}
                changeType={
                  result.aggregated.icir === null
                    ? "neutral"
                    : result.aggregated.icir > 0
                    ? "positive"
                    : result.aggregated.icir < 0
                    ? "negative"
                    : "neutral"
                }
                description={locale === "ko" ? "IC 일관성 (평균/표준편차)" : "IC consistency (mean/std)"}
                hasVeto={hasVeto}
              />

              <BacktestMetricCard
                label={locale === "ko" ? "평균 Hit Rate" : "Mean Hit Rate"}
                value={result.aggregated.hitRateMean}
                status={result.status === "completed" ? "cached" : "error"}
                formatter={(v) => `${(v * 100).toFixed(1)}%`}
                description={locale === "ko" ? "신호 방향 일치 비율" : "Directional accuracy"}
                hasVeto={hasVeto}
              />

              <BacktestMetricCard
                label={locale === "ko" ? "누적 OOS 수익률" : "Cumulative OOS Return"}
                value={result.aggregated.totalReturn}
                status={result.status === "completed" ? "cached" : "error"}
                formatter={(v) => (v >= 0 ? "+" : "") + (v * 100).toFixed(2) + "%"}
                changeType={
                  result.aggregated.totalReturn === null
                    ? "neutral"
                    : result.aggregated.totalReturn > 0
                    ? "positive"
                    : result.aggregated.totalReturn < 0
                    ? "negative"
                    : "neutral"
                }
                description={locale === "ko" ? "비용 차감 후 순수익률 (복리)" : "Net compounded return after costs"}
                hasVeto={hasVeto}
              />

              <BacktestMetricCard
                label={locale === "ko" ? "최대 낙폭 (Max DD)" : "Max Drawdown"}
                value={result.aggregated.maxDrawdown}
                status={result.status === "completed" ? "cached" : "error"}
                formatter={(v) => `${(v * 100).toFixed(2)}%`}
                changeType={
                  result.aggregated.maxDrawdown === null
                    ? "neutral"
                    : result.aggregated.maxDrawdown < 0
                    ? "negative"
                    : "neutral"
                }
                description={locale === "ko" ? "평가 구간별 누적 최고치 대비 하락" : "Peak to trough cumulative drop"}
                hasVeto={hasVeto}
              />

              <BacktestMetricCard
                label={locale === "ko" ? "총 거래 비용" : "Total Costs (Bps)"}
                value={result.aggregated.transactionCostTotalBps}
                status={result.status === "completed" ? "cached" : "error"}
                formatter={(v) => `${Math.round(v)} bps`}
                description={locale === "ko" ? "수수료+세금+슬리피지 합산" : "Commissions + taxes + slippage"}
                hasVeto={hasVeto}
              />
            </div>

            {/* Benchmark & Excess Return + Turnover Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <BacktestMetricCard
                label={locale === "ko" ? "벤치마크 누적 수익률" : "Benchmark Return"}
                value={result.aggregated.benchmarkTotalReturn}
                status={result.aggregated.benchmarkTotalReturn !== null ? "cached" : "insufficient_data"}
                formatter={(v) => (v >= 0 ? "+" : "") + (v * 100).toFixed(2) + "%"}
                changeType={
                  result.aggregated.benchmarkTotalReturn === null
                    ? "neutral"
                    : result.aggregated.benchmarkTotalReturn > 0
                    ? "positive"
                    : result.aggregated.benchmarkTotalReturn < 0
                    ? "negative"
                    : "neutral"
                }
                description={
                  locale === "ko"
                    ? `${result.oosSummaries[0]?.benchmarkAssetId ?? "벤치마크"} 복리 기준`
                    : `${result.oosSummaries[0]?.benchmarkAssetId ?? "Benchmark"} compounded`
                }
                hasVeto={hasVeto}
              />
              <BacktestMetricCard
                label={locale === "ko" ? "초과 수익률 (Excess)" : "Excess Return"}
                value={result.aggregated.excessTotalReturn}
                status={result.aggregated.excessTotalReturn !== null ? "cached" : "insufficient_data"}
                formatter={(v) => (v >= 0 ? "+" : "") + (v * 100).toFixed(2) + "%"}
                changeType={
                  result.aggregated.excessTotalReturn === null
                    ? "neutral"
                    : result.aggregated.excessTotalReturn > 0
                    ? "positive"
                    : result.aggregated.excessTotalReturn < 0
                    ? "negative"
                    : "neutral"
                }
                description={locale === "ko" ? "전략 수익률 - 벤치마크 수익률" : "Strategy return minus benchmark"}
                hasVeto={hasVeto}
              />
              <BacktestMetricCard
                label={locale === "ko" ? "평균 포트폴리오 교체율" : "Avg Turnover"}
                value={result.aggregated.turnover}
                status={result.aggregated.turnover !== null ? "cached" : "insufficient_data"}
                formatter={(v) => `${(v * 100).toFixed(1)}%`}
                description={locale === "ko" ? "구간 간 포트폴리오 교체 비율" : "Portfolio weight change per period"}
                hasVeto={false}
              />
            </div>

            {/* IC Bar Chart */}
            <IcChart oosSummaries={result.oosSummaries} hasVeto={hasVeto} />

            {/* Detailed Table */}
            <OosSummaryTable oosSummaries={result.oosSummaries} hasVeto={hasVeto} />
          </div>
        ) : (
          <div className="border border-dashed border-kt-border-panel/80 rounded-kt-card p-12 bg-kt-bg-overlay-300/10 flex flex-col items-center justify-center text-center gap-3">
            <BarChart3 className="w-8 h-8 text-kt-text-muted opacity-40" />
            <div className="flex flex-col gap-1 max-w-sm">
              <span className="text-xs font-semibold text-kt-text-secondary">
                {locale === "ko" ? "시뮬레이션 실행 대기 중" : "Awaiting Backtest Execution"}
              </span>
              <p className="text-[11px] text-kt-text-muted leading-relaxed">
                {locale === "ko"
                  ? "상단의 시뮬레이션 파라미터를 조절하고 실행 버튼을 누르시면, 동적으로 백테스트가 연산되어 정보 계수 및 운용 수익률 지표가 시각화됩니다."
                  : "Configure the options above and click 'Run Simulation' to execute the backtest. Period ICs and net return metrics will be computed dynamically."}
              </p>
            </div>
          </div>
        )}

        {/* Strategy Research Log */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-kt-text-muted" />
            <span className="text-xs font-semibold text-kt-text-primary">
              {locale === "ko" ? "전략 연구 기록" : "Strategy Research Log"}
            </span>
          </div>
          <StrategyResearchPanel />
        </div>
      </div>
    </div>
  );
};
