"use client";

import React, { useEffect, useState } from "react";
import { StrategyTrialRecord } from "@/domain/strategy/strategy-trial-record";
import { useI18n } from "@/i18n/use-i18n";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  BarChart2,
} from "lucide-react";

/**
 * StrategyResearchPanel
 *
 * 전략 연구 기록 패널.
 * 성과가 좋든 나쁘든 모든 trial을 표시한다. rejected 전략도 사라지지 않는다.
 *
 * 금지 표현:
 * - 검증된 수익 전략 / 수익 가능성 높음 / 매수 유망 / 시장중립 완성
 * - 이 패널은 연구 기록이며 주문 추천이 아니다.
 */

type TrialSummary = {
  total: number;
  rejected: number;
  draft: number;
  watchCandidate: number;
  dataSnoopingCount: number;
};

function summarize(trials: StrategyTrialRecord[]): TrialSummary {
  return {
    total: trials.length,
    rejected: trials.filter((t) => t.validationStatus === "rejected").length,
    draft: trials.filter((t) => t.validationStatus === "draft").length,
    watchCandidate: trials.filter(
      (t) => t.validationStatus === "watch_candidate"
    ).length,
    dataSnoopingCount: trials.filter((t) =>
      t.biasWarnings.includes("data_snooping_possible")
    ).length,
  };
}

function StatusIcon({ status }: { status: StrategyTrialRecord["validationStatus"] }) {
  if (status === "rejected" || status === "retired")
    return <XCircle className="w-3.5 h-3.5 text-kt-negative-text flex-shrink-0" />;
  if (status === "watch_candidate")
    return <CheckCircle className="w-3.5 h-3.5 text-kt-positive-text flex-shrink-0" />;
  if (status === "backtested")
    return <BarChart2 className="w-3.5 h-3.5 text-kt-text-secondary flex-shrink-0" />;
  return <Clock className="w-3.5 h-3.5 text-kt-text-muted flex-shrink-0" />;
}

function BiasWarningBadge({ warning }: { warning: string }) {
  const labels: Record<string, string> = {
    data_snooping_possible: "데이터 스누핑 가능성",
    sample_universe_only: "표본 유니버스",
    insufficient_oos_period: "OOS 기간 부족",
    survivorship_bias_possible: "생존편향 가능",
    lookahead_bias_possible: "선견편향 가능",
    high_market_beta: "시장 방향성 노출 높음",
    regime_dependency_high: "레짐 의존도 높음",
    adjusted_price_missing: "수정주가 없음",
    high_parameter_sensitivity: "파라미터 민감도 높음",
  };

  const isHighRisk =
    warning === "data_snooping_possible" ||
    warning === "high_market_beta" ||
    warning === "regime_dependency_high";

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[9px] font-semibold ${
        isHighRisk
          ? "bg-kt-negative-weak/30 text-kt-negative-text border border-kt-negative-weak/60"
          : "bg-kt-bg-surface-200 text-kt-text-muted border border-kt-border-panel/60"
      }`}
    >
      {labels[warning] ?? warning}
    </span>
  );
}

export const StrategyResearchPanel: React.FC = () => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [trials, setTrials] = useState<StrategyTrialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetch_() {
      try {
        const res = await fetch("/api/strategy/trials");
        if (!res.ok) throw new Error("Failed to fetch trials");
        const envelope = await res.json();
        if (active && envelope?.value?.trials) {
          setTrials(envelope.value.trials);
        }
      } catch (err) {
        if (active) setError(String(err));
      } finally {
        if (active) setLoading(false);
      }
    }
    fetch_();
    return () => {
      active = false;
    };
  }, []);

  const summary = summarize(trials);

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-kt-border-panel pb-2">
        <BookOpen className="w-4 h-4 text-kt-text-secondary flex-shrink-0" />
        <span className="text-xs font-bold text-kt-text-primary">
          {isKo ? "전략 연구 기록" : "Strategy Research Log"}
        </span>
        <span className="ml-auto text-[10px] text-kt-text-muted border border-kt-border-panel/60 px-1.5 py-0.5 rounded-[3px] bg-kt-bg-surface-200">
          {isKo ? "기능 검증용" : "Diagnostic Only"}
        </span>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-kt-text-muted leading-relaxed border border-kt-border-panel/40 bg-kt-bg-body/40 rounded-kt-card px-3 py-2">
        {isKo
          ? "이 기록은 전략 연구 현황이며 투자 추천이 아닙니다. rejected 전략을 포함한 모든 실험이 표시됩니다."
          : "This log shows strategy research history, not investment advice. All trials including rejected ones are shown."}
      </p>

      {/* Summary Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              label: isKo ? "전체 trial" : "Total Trials",
              value: summary.total,
              warn: false,
            },
            {
              label: isKo ? "반려" : "Rejected",
              value: summary.rejected,
              warn: false,
            },
            {
              label: isKo ? "검토 후보" : "Watch Candidate",
              value: summary.watchCandidate,
              warn: false,
            },
            {
              label: isKo ? "스누핑 경고" : "Snooping Warn",
              value: summary.dataSnoopingCount,
              warn: summary.dataSnoopingCount > 0,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-kt-bg-body/40 border border-kt-border-panel/60 rounded-kt-card p-2 text-center"
            >
              <div
                className={`text-base font-bold tabular-nums ${item.warn ? "text-kt-negative-text" : "text-kt-text-primary"}`}
              >
                {item.value}
              </div>
              <div className="text-[10px] text-kt-text-muted">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Trial List */}
      {loading && (
        <div className="text-xs text-kt-text-muted py-4 text-center animate-pulse">
          {isKo ? "로딩 중..." : "Loading..."}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-kt-negative-text py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {isKo ? "데이터 로드 실패: " : "Failed to load: "}
          {error}
        </div>
      )}

      {!loading && !error && trials.length === 0 && (
        <div className="text-xs text-kt-text-muted py-6 text-center">
          {isKo
            ? "등록된 전략 연구 기록이 없습니다."
            : "No strategy trials registered."}
          <br />
          <span className="text-[10px]">
            {isKo
              ? "npm run strategy:trial 로 기록을 추가할 수 있습니다."
              : "Use npm run strategy:trial to add records."}
          </span>
        </div>
      )}

      {!loading && !error && trials.length > 0 && (
        <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
          {trials.map((trial) => (
            <div
              key={trial.id}
              className="bg-kt-bg-body/40 border border-kt-border-panel/60 rounded-kt-card p-3 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2">
                <StatusIcon status={trial.validationStatus} />
                <span className="text-[11px] font-semibold text-kt-text-primary truncate">
                  {trial.strategyId}
                </span>
                <span className="text-[10px] text-kt-text-muted">
                  / {trial.variantId}
                </span>
                <span
                  className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-[3px] uppercase ${
                    trial.validationStatus === "rejected" ||
                    trial.validationStatus === "retired"
                      ? "bg-kt-negative-weak/30 text-kt-negative-text border border-kt-negative-weak/60"
                      : trial.validationStatus === "watch_candidate"
                      ? "bg-kt-positive-weak/30 text-kt-positive-text border border-kt-positive-weak/60"
                      : "bg-kt-bg-surface-200 text-kt-text-muted border border-kt-border-panel/60"
                  }`}
                >
                  {trial.validationStatus}
                </span>
              </div>

              <p className="text-[10px] text-kt-text-secondary leading-relaxed">
                {trial.thesisKo}
              </p>

              {/* Metrics */}
              {trial.observedMetrics.spearmanIc !== null && (
                <div className="flex items-center gap-3 text-[10px] text-kt-text-muted">
                  <span>
                    IC:{" "}
                    <span className="text-kt-text-secondary tabular-nums">
                      {trial.observedMetrics.spearmanIc?.toFixed(4)}
                    </span>
                  </span>
                  {trial.observedMetrics.sharpe !== null && (
                    <span>
                      Sharpe:{" "}
                      <span className="text-kt-text-secondary tabular-nums">
                        {trial.observedMetrics.sharpe?.toFixed(2)}
                      </span>
                    </span>
                  )}
                  {trial.observedMetrics.maxDrawdown !== null && (
                    <span>
                      MDD:{" "}
                      <span className="text-kt-negative-text tabular-nums">
                        {(trial.observedMetrics.maxDrawdown! * 100).toFixed(1)}%
                      </span>
                    </span>
                  )}
                </div>
              )}

              {/* Bias Warnings */}
              {trial.biasWarnings.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {trial.biasWarnings.map((w) => (
                    <BiasWarningBadge key={w} warning={w} />
                  ))}
                </div>
              )}

              {/* Rejection Reason */}
              {trial.rejectionReason && (
                <div className="text-[10px] text-kt-text-muted bg-kt-negative-weak/10 border border-kt-negative-weak/30 rounded px-2 py-1">
                  {isKo ? "반려 사유: " : "Rejection: "}
                  {trial.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
