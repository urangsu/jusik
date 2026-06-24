"use client";

import React, { useEffect, useState } from "react";
import { IndividualSignalIcResult, IndividualSignalIcSeverity, IndividualSignalIcHorizon } from "@/domain/audit/individual-signal-ic-result";
import { DataEnvelope } from "@/domain/common/data-status";
import { useI18n } from "@/i18n/use-i18n";
import { BarChart3, Info, ShieldAlert, Play, Loader2, Clock } from "lucide-react";

type Props = {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
};

export const IndividualSignalIcAuditPanel: React.FC<Props> = ({ universeId }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<IndividualSignalIcResult[]>([]);

  // Local filters
  const [horizonFilter, setHorizonFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit/individual-signal-ic?universeId=${universeId}`);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const envelope: DataEnvelope<IndividualSignalIcResult[]> = await res.json();
      if (envelope.status === "error") {
        throw new Error(envelope.message || "Failed to fetch audit results");
      }
      setResults(envelope.value || []);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [universeId]);

  const handleRunAudit = async () => {
    setCalculating(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/individual-signal-ic/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId }),
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 405) {
          throw new Error(
            isKo
              ? "개별 신호 IC 연산 권한이 없거나 비활성화되어 있습니다. LOCAL_SETTINGS_WRITE_ENABLED=true 설정이 필요합니다."
              : "Individual signal IC write permission is disabled. Set LOCAL_SETTINGS_WRITE_ENABLED=true in local settings."
          );
        }
        throw new Error(`API run error: ${res.status}`);
      }

      const envelope: DataEnvelope<IndividualSignalIcResult[]> = await res.json();
      if (envelope.status === "error") {
        throw new Error(envelope.message || "Audit calculation failed");
      }

      setResults(envelope.value || []);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-kt-bg-surface-100/40 border border-kt-border-panel/40 rounded-kt-card animate-pulse flex flex-col gap-3">
        <div className="h-4 bg-kt-bg-overlay-300 w-1/4 rounded" />
        <div className="h-24 bg-kt-bg-overlay-300 rounded" />
      </div>
    );
  }

  // Filter results locally
  const filteredResults = results.filter((r) => {
    if (horizonFilter !== "all" && r.horizon !== horizonFilter) return false;
    if (severityFilter !== "all" && r.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-kt-bg-surface-100 border border-kt-border-panel p-4 rounded-kt-card">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-kt-text-primary">
            {isKo ? "개별 신호 예측력 감사 (Individual Signal IC Audit)" : "Individual Signal IC Audit"}
          </span>
          <p className="text-[11px] text-kt-text-muted leading-relaxed max-w-xl">
            {isKo
              ? "유니버스 내 개별 atomic signal들의 점수(score)와 미래 수익률(forward return) 간의 상관관계(Spearman/Pearson IC 및 Spread)를 계산하여 통계적 예측력을 검증합니다."
              : "Calculates Spearman/Pearson correlation and Quantile Spread between atomic signal scores and forward returns to verify prediction accuracy."}
          </p>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={calculating}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-kt-positive hover:bg-kt-positive/90 text-white rounded-kt-pill text-xs font-semibold cursor-pointer disabled:opacity-50 select-none"
        >
          {calculating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{isKo ? "감사 계산 중..." : "Running Audit..."}</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>{isKo ? "신호 IC 감사 실행" : "Run IC Audit"}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-kt-negative-weak/10 border border-kt-negative-text/20 rounded-kt-card text-kt-negative-text flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="text-xs">{error}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      {results.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap bg-kt-bg-surface-100 border border-kt-border-panel p-3.5 rounded-kt-card">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-kt-text-muted font-medium uppercase">{isKo ? "평가 Horizon 필터" : "Horizon Filter"}</span>
            <select
              value={horizonFilter}
              onChange={(e) => setHorizonFilter(e.target.value)}
              className="bg-kt-bg-body border border-kt-border-panel rounded px-3 py-1 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted cursor-pointer font-mono"
            >
              <option value="all">{isKo ? "모두" : "All"}</option>
              <option value="forward_5d">forward_5d (1w)</option>
              <option value="forward_20d">forward_20d (1m)</option>
              <option value="forward_60d">forward_60d (3m)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-kt-text-muted font-medium uppercase">{isKo ? "Severity 등급 필터" : "Severity Filter"}</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-kt-bg-body border border-kt-border-panel rounded px-3 py-1 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted cursor-pointer font-mono"
            >
              <option value="all">{isKo ? "모두" : "All"}</option>
              <option value="strong_positive">strong_positive</option>
              <option value="weak_positive">weak_positive</option>
              <option value="neutral">neutral</option>
              <option value="weak_negative">weak_negative</option>
              <option value="strong_negative">strong_negative</option>
              <option value="insufficient_sample">insufficient_sample</option>
              <option value="not_available">not_available</option>
            </select>
          </div>
        </div>
      )}

      {results.length === 0 ? (
        <div className="p-12 border border-dashed border-kt-border-panel/80 rounded-kt-card bg-kt-bg-overlay-300/10 flex flex-col items-center justify-center text-center gap-3">
          <Info className="w-8 h-8 text-kt-text-muted opacity-40" />
          <div className="flex flex-col gap-1 max-w-sm">
            <span className="text-xs font-semibold text-kt-text-secondary">
              {isKo ? "저장된 개별 신호 IC 감사 기록이 없습니다" : "No Individual Signal IC Records"}
            </span>
            <p className="text-[11px] text-kt-text-muted leading-relaxed">
              {isKo
                ? "상단의 '신호 IC 감사 실행' 버튼을 누르거나 CLI 스크립트 실행을 통해 감사를 수행하여 기록을 생성해 주세요."
                : "Please click 'Run IC Audit' or run CLI script to generate individual signal IC results."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel rounded-kt-card overflow-hidden">
          <div className="px-3 py-2 bg-kt-bg-overlay-100 border-b border-kt-border-panel/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-kt-text-secondary" />
              <span className="text-xs font-bold text-kt-text-primary">
                {isKo ? "개별 신호 IC 감사 내역" : "Individual Signal IC Results"}
              </span>
            </div>
            <div className="text-[10px] text-kt-text-muted font-mono">
              Observed: {filteredResults.length} / {results.length} records
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="border-b border-kt-border-panel/30 bg-kt-bg-overlay-100 text-kt-text-secondary font-semibold">
                  <th className="py-2.5 px-3">{isKo ? "신호 ID" : "Signal ID"}</th>
                  <th className="py-2.5 px-2">{isKo ? "Horizon" : "Horizon"}</th>
                  <th className="py-2.5 px-2 text-right">{isKo ? "표본 수" : "Sample"}</th>
                  <th className="py-2.5 px-2 text-right">{isKo ? "IC Spearman" : "IC Spearman"}</th>
                  <th className="py-2.5 px-2 text-right">{isKo ? "IC Pearson" : "IC Pearson"}</th>
                  <th className="py-2.5 px-2 text-right">{isKo ? "Quantile Spread" : "Quantile Spread"}</th>
                  <th className="py-2.5 px-3 text-center">{isKo ? "등급" : "Severity"}</th>
                  <th className="py-2.5 px-3">{isKo ? "경고" : "Warnings"}</th>
                  <th className="py-2.5 px-2">{isKo ? "소스" : "Source"}</th>
                  <th className="py-2.5 px-3 text-right">{isKo ? "수행 시간" : "Calculated At"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kt-border-panel/20 text-kt-text-primary">
                {filteredResults.map((r) => {
                  const isPositive = r.icSpearman !== null && r.icSpearman > 0;
                  const isNegative = r.icSpearman !== null && r.icSpearman < 0;

                  let severityBadge = "bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel/40";
                  if (r.severity === "strong_positive" || r.severity === "weak_positive") {
                    severityBadge = "bg-kt-positive-weak/10 text-kt-positive-text border border-kt-positive/20";
                  } else if (r.severity === "strong_negative" || r.severity === "weak_negative") {
                    severityBadge = "bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative/20";
                  }

                  const spreadVal = r.topBottomSpread;

                  return (
                    <tr key={r.id} className="hover:bg-kt-bg-overlay-100/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-kt-text-primary">{r.signalLabelKo || r.signalId}</div>
                        <div className="text-[9px] text-kt-text-secondary font-mono mt-0.5">{r.signalId}</div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-kt-text-secondary">{r.horizon}</td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">{r.sampleSize}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold tabular-nums">
                        {r.icSpearman !== null ? (
                          <span className={isPositive ? "text-kt-positive-text" : isNegative ? "text-kt-negative-text" : ""}>
                            {r.icSpearman > 0 ? "+" : ""}{r.icSpearman.toFixed(4)}
                          </span>
                        ) : (
                          "null"
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-kt-text-secondary">
                        {r.icPearson !== null ? (
                          <span className={r.icPearson > 0 ? "text-kt-positive-text" : r.icPearson < 0 ? "text-kt-negative-text" : ""}>
                            {r.icPearson > 0 ? "+" : ""}{r.icPearson.toFixed(4)}
                          </span>
                        ) : (
                          "null"
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                        {spreadVal !== null ? (
                          <span className={spreadVal > 0 ? "text-kt-positive-text" : spreadVal < 0 ? "text-kt-negative-text" : "text-kt-text-secondary"}>
                            {spreadVal > 0 ? "+" : ""}{(spreadVal * 100).toFixed(2)}%
                          </span>
                        ) : (
                          "null"
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-semibold inline-block ${severityBadge}`}>
                          {r.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {r.warnings.filter((w) => w !== "sample_universe_only").map((w) => {
                            const isWarningText = w === "weak_signal_high_weight" || w === "negative_ic" || (w as string) === "negative_contribution" || w === "unstable_across_horizons";
                            const isInsufficientText = w === "insufficient_sample" || w === "missing_signal_score" || w === "missing_forward_return";

                            let color = "bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel/40";
                            if (isWarningText) {
                              color = "bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative/20";
                            } else if (isInsufficientText) {
                              color = "bg-kt-bg-panel text-kt-text-secondary border border-kt-border-panel/40";
                            }

                            return (
                              <span key={w} className={`px-1 py-0.5 rounded-[3px] text-[8px] font-mono leading-none ${color}`}>
                                {w}
                              </span>
                            );
                          })}
                          {r.warnings.length === 1 && r.warnings[0] === "sample_universe_only" && (
                            <span className="text-kt-text-muted/40 text-[9px] font-mono italic">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-[9px] text-kt-text-secondary">{r.sourceTierSummary}</td>
                      <td className="py-2.5 px-3 text-right text-kt-text-secondary font-mono text-[9px]">
                        {new Date(r.calculatedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
