"use client";

import React, { useState } from "react";
import { ShieldCheck, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle, Minus } from "lucide-react";
import type { ProviderReadinessReport, ProviderReadinessCheck, ProviderReadinessStatus } from "@/domain/ops/provider-readiness";
import type { DataEnvelope } from "@/domain/common/data-status";
import { useI18n } from "@/i18n/use-i18n";

function StatusBadge({ status }: { status: ProviderReadinessStatus }) {
  const map: Record<ProviderReadinessStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    ready: { label: "준비", cls: "bg-kt-positive/10 text-kt-positive-text border-kt-positive/20", icon: <CheckCircle className="w-2.5 h-2.5" /> },
    not_configured: { label: "미설정", cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: <AlertTriangle className="w-2.5 h-2.5" /> },
    personal_fallback_disabled: { label: "비활성(개인)", cls: "bg-kt-bg-overlay-200 text-kt-text-muted border-kt-border-panel/40", icon: <Minus className="w-2.5 h-2.5" /> },
    disabled_by_policy: { label: "정책 비활성", cls: "bg-kt-bg-overlay-200 text-kt-text-muted border-kt-border-panel/40", icon: <Minus className="w-2.5 h-2.5" /> },
    api_required: { label: "KEY 필요", cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: <AlertTriangle className="w-2.5 h-2.5" /> },
    error: { label: "오류", cls: "bg-kt-negative-weak/10 text-kt-negative-text border-kt-negative-text/20", icon: <XCircle className="w-2.5 h-2.5" /> },
  };

  const m = map[status] || map["error"];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-bold border ${m.cls}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

function ReadinessRow({ check }: { check: ProviderReadinessCheck }) {
  return (
    <tr className="border-b border-kt-border-panel/10">
      <td className="py-1 pr-3 font-mono text-[8px] text-kt-text-secondary">{check.providerId}</td>
      <td className="py-1 pr-3"><StatusBadge status={check.status} /></td>
      <td className="py-1 pr-3 text-[8px] text-kt-text-muted">
        {check.configuredKeys.length}/{check.requiredKeys.length}
      </td>
      <td className="py-1 text-[8px] text-kt-text-muted max-w-[160px] truncate">
        {check.missingKeys.length > 0 ? check.missingKeys.join(", ") : "—"}
      </td>
    </tr>
  );
}

export const ProviderReadinessPanel: React.FC = () => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [report, setReport] = useState<ProviderReadinessReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchReadiness = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/provider-readiness");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DataEnvelope<ProviderReadinessReport> = await res.json();
      if (data.value) setReport(data.value);
    } catch (err: any) {
      setError(err.message || "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel/40 rounded-kt-card px-4 py-2.5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left group select-none"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-kt-text-muted group-hover:text-kt-text-secondary" />
        <span className="text-[10px] font-bold text-kt-text-secondary uppercase tracking-wider">
          {isKo ? "Provider 설정 준비 상태" : "Provider Configuration Readiness"}
        </span>
        {report && (
          <span className="ml-2 text-[8px] font-bold px-1.5 py-0.5 rounded border bg-kt-bg-overlay-100 text-kt-text-muted border-kt-border-panel/40">
            {isKo ? `준비 ${report.readyCount}개` : `${report.readyCount} ready`}
          </span>
        )}
        <span className="ml-auto text-[9px] text-kt-text-muted">
          {expanded ? (isKo ? "닫기" : "Hide") : (isKo ? "보기" : "Show")}
        </span>
      </button>

      {expanded && (
        <div className="mt-2.5 border-t border-kt-border-panel/30 pt-2.5 space-y-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReadiness}
              disabled={loading}
              id="provider-readiness-fetch-btn"
              className="flex items-center gap-1 px-3 py-1 bg-kt-bg-overlay-100 border border-kt-border-panel hover:bg-kt-bg-overlay-200 text-kt-text-secondary rounded-kt-pill text-[9px] font-semibold cursor-pointer disabled:opacity-50 select-none"
            >
              {loading ? (
                <><Loader2 className="w-3 h-3 animate-spin" />{isKo ? "조회 중..." : "Loading..."}</>
              ) : (
                <><RefreshCw className="w-3 h-3" />{isKo ? "설정 상태 조회" : "Check Readiness"}</>
              )}
            </button>
          </div>

          {error && (
            <p className="text-[9px] text-kt-negative-text bg-kt-negative-weak/10 border border-kt-negative-text/20 rounded px-2 py-1">
              {error}
            </p>
          )}

          {!report && !loading && (
            <p className="text-[9px] text-kt-text-muted">
              {isKo ? "설정 상태를 조회하세요." : "Check readiness to see provider configuration status."}
            </p>
          )}

          {report && (
            <>
              <div className="flex gap-4 text-[8px] text-kt-text-muted">
                <span>{isKo ? "준비:" : "Ready:"} <strong className="text-kt-positive-text">{report.readyCount}</strong></span>
                <span>{isKo ? "미설정:" : "Not configured:"} <strong className="text-yellow-600">{report.notConfiguredCount}</strong></span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[8px] border-collapse">
                  <thead>
                    <tr className="border-b border-kt-border-panel/30">
                      <th className="text-left py-1 pr-3 text-kt-text-muted font-semibold">Provider</th>
                      <th className="text-left py-1 pr-3 text-kt-text-muted font-semibold">{isKo ? "상태" : "Status"}</th>
                      <th className="text-left py-1 pr-3 text-kt-text-muted font-semibold">{isKo ? "설정" : "Keys"}</th>
                      <th className="text-left py-1 text-kt-text-muted font-semibold">{isKo ? "누락 키" : "Missing Keys"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.readiness.map((c) => (
                      <ReadinessRow key={c.providerId} check={c} />
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[8px] text-kt-text-muted">
                {isKo
                  ? "API key 값은 표시되지 않습니다. not_configured는 설정 대기 상태이며 실패가 아닙니다."
                  : "API key values are never displayed. not_configured means awaiting setup, not a failure."}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
