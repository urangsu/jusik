"use client";

import React, { useState } from "react";
import { ShieldAlert, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type {
  OperationalSmokeReport,
  OperationalSmokeResult,
} from "@/domain/ops/operational-smoke";
import { DataEnvelope } from "@/domain/common/data-status";
import { useI18n } from "@/i18n/use-i18n";

export const OperationalSmokePanel: React.FC = () => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [report, setReport] = useState<OperationalSmokeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchLatest = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/smoke/latest");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DataEnvelope<OperationalSmokeReport | null> = await res.json();
      setReport(data.value ?? null);
    } catch (err: any) {
      setError(err.message || "최근 결과 조회 실패");
    } finally {
      setRefreshing(false);
    }
  };

  const runSmoke = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/smoke/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok && res.status === 500) throw new Error(`HTTP ${res.status}`);
      const data: DataEnvelope<OperationalSmokeReport> = await res.json();
      if (data.value) setReport(data.value);
    } catch (err: any) {
      setError(err.message || "스모크 실행 실패");
    } finally {
      setLoading(false);
    }
  };

  const severityIcon = (r: OperationalSmokeResult) => {
    if (!r.passed) return <XCircle className="w-3 h-3 text-kt-negative-text flex-shrink-0" />;
    if (r.severity === "warning") return <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />;
    return <CheckCircle className="w-3 h-3 text-kt-positive-text flex-shrink-0" />;
  };

  return (
    <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel/40 rounded-kt-card px-4 py-2.5">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left group select-none"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-kt-text-muted group-hover:text-kt-text-secondary" />
        <span className="text-[10px] font-bold text-kt-text-secondary uppercase tracking-wider">
          {isKo ? "운영 스모크 점검" : "Operational Smoke Check"}
        </span>
        {report && (
          <span
            className={`ml-2 text-[8px] font-bold px-1.5 py-0.5 rounded border ${
              report.passed
                ? "bg-kt-positive/10 text-kt-positive-text border-kt-positive/20"
                : "bg-kt-negative-weak/10 text-kt-negative-text border-kt-negative-text/20"
            }`}
          >
            {report.passed
              ? (isKo ? "정상" : "Pass")
              : `${report.failureCount} ${isKo ? "실패" : "fail"}`}
          </span>
        )}
        <span className="ml-auto text-[9px] text-kt-text-muted">
          {expanded ? (isKo ? "닫기" : "Hide") : (isKo ? "보기" : "Show")}
        </span>
      </button>

      {expanded && (
        <div className="mt-2.5 border-t border-kt-border-panel/30 pt-2.5 space-y-2.5">
          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={runSmoke}
              disabled={loading}
              id="smoke-run-btn"
              className="flex items-center gap-1 px-3 py-1 bg-kt-positive hover:bg-kt-positive/90 text-white rounded-kt-pill text-[9px] font-semibold cursor-pointer disabled:opacity-50 select-none"
            >
              {loading ? (
                <><Loader2 className="w-3 h-3 animate-spin" />{isKo ? "실행 중..." : "Running..."}</>
              ) : (
                isKo ? "운영 스모크 실행" : "Run Smoke"
              )}
            </button>
            <button
              onClick={fetchLatest}
              disabled={refreshing}
              id="smoke-refresh-btn"
              className="flex items-center gap-1 px-3 py-1 bg-kt-bg-overlay-100 border border-kt-border-panel hover:bg-kt-bg-overlay-200 text-kt-text-secondary rounded-kt-pill text-[9px] font-semibold cursor-pointer disabled:opacity-50 select-none"
            >
              {refreshing ? (
                <><Loader2 className="w-3 h-3 animate-spin" />{isKo ? "새로고침..." : "Loading..."}</>
              ) : (
                <><RefreshCw className="w-3 h-3" />{isKo ? "최근 결과" : "Latest Result"}</>
              )}
            </button>
          </div>

          {error && (
            <p className="text-[9px] text-kt-negative-text bg-kt-negative-weak/10 border border-kt-negative-text/20 rounded px-2 py-1">
              {error}
            </p>
          )}

          {/* Report summary */}
          {report && (
            <>
              <div className="flex items-center gap-3 text-[9px] text-kt-text-muted">
                <span>{isKo ? "점검 시각:" : "Checked:"} {new Date(report.createdAt).toLocaleString(locale)}</span>
                <span>{isKo ? "대상:" : "Targets:"} {report.results.length}</span>
                <span>{isKo ? "경고:" : "Warnings:"} {report.warningCount}</span>
              </div>

              {/* Result table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[8px] border-collapse">
                  <thead>
                    <tr className="border-b border-kt-border-panel/30">
                      <th className="text-left py-1 pr-2 text-kt-text-muted font-semibold w-4"></th>
                      <th className="text-left py-1 pr-3 text-kt-text-muted font-semibold">ID</th>
                      <th className="text-left py-1 pr-3 text-kt-text-muted font-semibold">HTTP</th>
                      <th className="text-left py-1 pr-3 text-kt-text-muted font-semibold">{isKo ? "상태" : "Status"}</th>
                      <th className="text-left py-1 pr-3 text-kt-text-muted font-semibold">{isKo ? "기대값" : "Expected"}</th>
                      <th className="text-left py-1 text-kt-text-muted font-semibold">{isKo ? "메시지" : "Message"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.results.map((r) => (
                      <tr
                        key={r.id}
                        className={`border-b border-kt-border-panel/10 ${!r.passed ? "bg-kt-negative-weak/5" : ""}`}
                      >
                        <td className="py-1 pr-2">{severityIcon(r)}</td>
                        <td className="py-1 pr-3 font-mono text-kt-text-secondary">{r.id}</td>
                        <td className="py-1 pr-3 text-kt-text-muted">{r.httpStatus ?? "—"}</td>
                        <td className="py-1 pr-3">
                          <span
                            className={`px-1 py-0.5 rounded text-[7px] font-bold ${
                              r.envelopeStatus === "not_supported"
                                ? "bg-kt-bg-overlay-200 text-kt-text-muted"
                                : r.envelopeStatus === "api_required"
                                ? "bg-yellow-500/10 text-yellow-600"
                                : r.envelopeStatus && ["cached", "real_time", "delayed", "eod", "stale"].includes(r.envelopeStatus)
                                ? "bg-kt-positive/10 text-kt-positive-text"
                                : "bg-kt-negative-weak/10 text-kt-negative-text"
                            }`}
                          >
                            {r.envelopeStatus ?? "N/A"}
                          </span>
                        </td>
                        <td className="py-1 pr-3 text-kt-text-muted">{r.expectedWithoutKey}</td>
                        <td className="py-1 text-kt-text-muted max-w-[160px] truncate">{r.message ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[8px] text-kt-text-muted">
                {isKo
                  ? "api_required와 not_supported는 정상 기대값입니다. HTTP 500과 DataEnvelope 누락만 실패로 처리됩니다."
                  : "api_required and not_supported are expected outcomes. Only HTTP 500 and missing DataEnvelope are failures."}
              </p>
            </>
          )}

          {!report && !loading && !refreshing && (
            <p className="text-[9px] text-kt-text-muted">
              {isKo ? "최근 스모크 결과 없음. 실행하거나 최근 결과를 조회하세요." : "No smoke report yet. Run or fetch the latest result."}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
