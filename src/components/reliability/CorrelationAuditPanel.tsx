"use client";

import React, { useEffect, useState } from "react";
import { FactorCorrelationResult, FactorCorrelationSeverity } from "@/domain/audit/factor-correlation-result";
import { DataEnvelope } from "@/domain/common/data-status";
import { useI18n } from "@/i18n/use-i18n";
import { BarChart3, Info, ShieldAlert, Play, Loader2 } from "lucide-react";

type Props = {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
};

export const CorrelationAuditPanel: React.FC<Props> = ({ universeId }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FactorCorrelationResult[]>([]);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit/factor-correlation?universeId=${universeId}`);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const envelope: DataEnvelope<FactorCorrelationResult[]> = await res.json();
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
      const res = await fetch("/api/audit/factor-correlation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ universeId, method: "spearman" }),
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 405) {
          throw new Error(
            isKo
              ? "팩터 상관관계 연산 권한이 없거나 비활성화되어 있습니다. LOCAL_SETTINGS_WRITE_ENABLED=true 설정이 필요합니다."
              : "Factor correlation write permission is disabled. Set LOCAL_SETTINGS_WRITE_ENABLED=true in local settings."
          );
        }
        throw new Error(`API run error: ${res.status}`);
      }

      const envelope: DataEnvelope<FactorCorrelationResult[]> = await res.json();
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

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-kt-bg-surface-100 border border-kt-border-panel p-4 rounded-kt-card">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-kt-text-primary">
            {isKo ? "팩터 간 상관관계 감사" : "Factor Correlation Audit"}
          </span>
          <p className="text-[11px] text-kt-text-muted leading-relaxed max-w-xl">
            {isKo
              ? "동일 유니버스 내 개별 atomic signal들의 점수 간 상관계수(Spearman)를 계산하여 중복도 및 다중공선성 위험을 점검합니다. (이 결과는 전략 분석 목적이며, 매수/매도 지시가 아닙니다.)"
              : "Calculates Spearman correlation between atomic signals to analyze factor redundancy and multicollinearity."}
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
              <span>{isKo ? "상관관계 감사 실행" : "Run Correlation Audit"}</span>
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

      {results.length === 0 ? (
        <div className="p-12 border border-dashed border-kt-border-panel/80 rounded-kt-card bg-kt-bg-overlay-300/10 flex flex-col items-center justify-center text-center gap-3">
          <Info className="w-8 h-8 text-kt-text-muted opacity-40" />
          <div className="flex flex-col gap-1 max-w-sm">
            <span className="text-xs font-semibold text-kt-text-secondary">
              {isKo ? "저장된 상관관계 감사 기록이 없습니다" : "No Factor Correlation Records"}
            </span>
            <p className="text-[11px] text-kt-text-muted leading-relaxed">
              {isKo
                ? "상단의 '상관관계 감사 실행' 버튼을 누르거나 CLI 스크립트 실행을 통해 감사를 수행하여 기록을 생성해 주세요."
                : "Please click 'Run Correlation Audit' or run CLI script to generate correlation results."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel rounded-kt-card overflow-hidden">
          <div className="px-3 py-2 bg-kt-bg-overlay-100 border-b border-kt-border-panel/50 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-kt-text-secondary" />
            <span className="text-xs font-bold text-kt-text-primary">
              {isKo ? "팩터 상관관계 분석 테이블" : "Factor Correlation Detail Matrix"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="border-b border-kt-border-panel/30 bg-kt-bg-overlay-100 text-kt-text-secondary font-semibold">
                  <th className="py-2.5 px-3">{isKo ? "팩터 A" : "Factor A"}</th>
                  <th className="py-2.5 px-3">{isKo ? "팩터 B" : "Factor B"}</th>
                  <th className="py-2.5 px-2">{isKo ? "구분" : "Method"}</th>
                  <th className="py-2.5 px-2 text-right">{isKo ? "표본 수" : "Sample"}</th>
                  <th className="py-2.5 px-3 text-right">{isKo ? "상관계수" : "Correlation"}</th>
                  <th className="py-2.5 px-3 text-center">{isKo ? "등급" : "Severity"}</th>
                  <th className="py-2.5 px-3">{isKo ? "경고" : "Warnings"}</th>
                  <th className="py-2.5 px-2">{isKo ? "소스" : "Source"}</th>
                  <th className="py-2.5 px-3 text-right">{isKo ? "수행 시간" : "Calculated At"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kt-border-panel/20 text-kt-text-primary">
                {results.map((r) => {
                  const isPositive = r.correlation !== null && r.correlation > 0;
                  const isNegative = r.correlation !== null && r.correlation < 0;

                  let severityBadge = "bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel/40";
                  if (r.severity === "danger") {
                    severityBadge = "bg-kt-positive-weak/10 text-kt-positive-text border border-kt-positive/20";
                  } else if (r.severity === "warn") {
                    severityBadge = "bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative/20";
                  }

                  return (
                    <tr key={r.id} className="hover:bg-kt-bg-overlay-100/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium">{r.factorA}</td>
                      <td className="py-2.5 px-3 font-mono font-medium">{r.factorB}</td>
                      <td className="py-2.5 px-2 font-mono uppercase text-kt-text-secondary">{r.method}</td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums">{r.sampleSize}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                        {r.correlation !== null ? (
                          <span className={isPositive ? "text-kt-positive-text" : isNegative ? "text-kt-negative-text" : ""}>
                            {r.correlation > 0 ? "+" : ""}{r.correlation.toFixed(4)}
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
                          {r.warnings.filter((w) => w !== "sample_universe_only").map((w) => (
                            <span key={w} className="px-1 py-0.5 bg-kt-bg-panel text-kt-text-secondary border border-kt-border-panel/40 rounded-[3px] text-[8px] font-mono">
                              {w}
                            </span>
                          ))}
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
