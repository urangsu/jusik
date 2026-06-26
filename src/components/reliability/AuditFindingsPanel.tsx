"use client";

import React, { useEffect, useState } from "react";
import {
  AuditFinding,
  AuditFindingSourceType,
  AuditFindingScope,
  AuditFindingSeverity,
} from "@/domain/audit/audit-finding";
import { DataEnvelope } from "@/domain/common/data-status";
import { useI18n } from "@/i18n/use-i18n";
import { BarChart3, Info, ShieldAlert, RefreshCw, Loader2, Link as LinkIcon, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { AiContextPack, StructuredAiOutput } from "@/domain/ai/structured-ai-output";
import { AiPromptInput } from "@/domain/ai/ai-prompt-input";
import { AiExplanationReplayRecord } from "@/domain/ai/ai-explanation-replay-ledger";
import type { AiProviderDescriptor } from "@/domain/ai/ai-provider";

type Props = {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
};

export const AuditFindingsPanel: React.FC<Props> = ({ universeId }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);

  // Expanded context packs state
  const [expandedContextPacks, setExpandedContextPacks] = useState<Record<string, boolean>>({});
  const [contextPackData, setContextPackData] = useState<Record<string, AiContextPack>>({});
  const [loadingContextPacks, setLoadingContextPacks] = useState<Record<string, boolean>>({});

  // Expanded prompt inputs state
  const [expandedPromptInputs, setExpandedPromptInputs] = useState<Record<string, boolean>>({});
  const [promptInputData, setPromptInputData] = useState<Record<string, AiPromptInput>>({});
  const [cachedBadgeData, setCachedBadgeData] = useState<Record<string, boolean>>({});
  const [loadingPromptInputs, setLoadingPromptInputs] = useState<Record<string, boolean>>({});

  // Expanded mock structured outputs state
  const [expandedMockOutputs, setExpandedMockOutputs] = useState<Record<string, boolean>>({});
  const [mockOutputData, setMockOutputData] = useState<Record<string, StructuredAiOutput>>({});
  const [loadingMockOutputs, setLoadingMockOutputs] = useState<Record<string, boolean>>({});
  const [mockModes, setMockModes] = useState<Record<string, "safe" | "forbidden_wording" | "ungrounded_claim" | "missing_disclaimer">>({});

  // Expanded replay logs state
  const [expandedReplayLogs, setExpandedReplayLogs] = useState<Record<string, boolean>>({});
  const [replayLogData, setReplayLogData] = useState<Record<string, AiExplanationReplayRecord[]>>({});
  const [loadingReplayLogs, setLoadingReplayLogs] = useState<Record<string, boolean>>({});

  // Provider policy status state
  const [providerDescriptors, setProviderDescriptors] = useState<AiProviderDescriptor[]>([]);
  const [showProviderStatus, setShowProviderStatus] = useState(false);

  // Local filters
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const fetchFindings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit/findings?universeId=${universeId}`);
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const envelope: DataEnvelope<AuditFinding[]> = await res.json();
      if (envelope.status === "error") {
        throw new Error(envelope.message || "Failed to fetch findings");
      }
      setFindings(envelope.value || []);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [universeId]);

  useEffect(() => {
    fetch("/api/ai/providers")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.value) setProviderDescriptors(data.value);
      })
      .catch(() => {});
  }, []);

  const handleRefreshFindings = async () => {
    setCalculating(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/findings/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeIndividualSignalIc: true,
          includeFactorCorrelation: true,
          includeMarketExposure: true,
        }),
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 405) {
          throw new Error(
            isKo
              ? "감사 Finding 갱신 권한이 없거나 비활성화되어 있습니다. LOCAL_SETTINGS_WRITE_ENABLED=true 설정이 필요합니다."
              : "Findings run permission is disabled. Set LOCAL_SETTINGS_WRITE_ENABLED=true in local settings."
          );
        }
        throw new Error(`API run error: ${res.status}`);
      }

      const envelope: DataEnvelope<AuditFinding[]> = await res.json();
      if (envelope.status === "error") {
        throw new Error(envelope.message || "Findings aggregation failed");
      }

      // Filter findings for this universe
      const allFindings = envelope.value || [];
      const universeFindings = allFindings.filter((f) => f.universeId === universeId || f.universeId === null);
      setFindings(universeFindings);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setCalculating(false);
    }
  };

  const handleToggleContextPack = async (findingId: string) => {
    const isExpanded = !!expandedContextPacks[findingId];
    setExpandedContextPacks((prev) => ({ ...prev, [findingId]: !isExpanded }));

    if (!isExpanded && !contextPackData[findingId]) {
      setLoadingContextPacks((prev) => ({ ...prev, [findingId]: true }));
      try {
        const res = await fetch(`/api/ai/context-pack/audit-finding?id=${findingId}`);
        if (!res.ok) {
          throw new Error(`Context pack API error: ${res.status}`);
        }
        const envelope: DataEnvelope<AiContextPack> = await res.json();
        if (envelope.status === "error" || envelope.status === "not_found") {
          throw new Error(envelope.message || "Failed to fetch context pack");
        }
        if (envelope.value) {
          setContextPackData((prev) => ({ ...prev, [findingId]: envelope.value! }));
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingContextPacks((prev) => ({ ...prev, [findingId]: false }));
      }
    }
  };

  const handleTogglePromptInput = async (findingId: string) => {
    const isExpanded = !!expandedPromptInputs[findingId];
    setExpandedPromptInputs((prev) => ({ ...prev, [findingId]: !isExpanded }));

    if (!isExpanded && !promptInputData[findingId]) {
      setLoadingPromptInputs((prev) => ({ ...prev, [findingId]: true }));
      try {
        const res = await fetch("/api/ai/explanation-requests/audit-finding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingId,
            locale: isKo ? "ko" : "en",
            userPrompt: "이 Finding을 감사 관점에서 설명해줘",
          }),
        });
        if (!res.ok) {
          throw new Error(`Prompt input API error: ${res.status}`);
        }
        const envelope = await res.json();
        if (envelope.status === "error") {
          throw new Error(envelope.message || "Failed to fetch prompt contract");
        }
        if (envelope.value) {
          setPromptInputData((prev) => ({ ...prev, [findingId]: envelope.value.promptInput }));
          setCachedBadgeData((prev) => ({ ...prev, [findingId]: !!envelope.value.cached }));
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingPromptInputs((prev) => ({ ...prev, [findingId]: false }));
      }
    }
  };

  const handleRunMockOutput = async (findingId: string) => {
    const isExpanded = !!expandedMockOutputs[findingId];
    setExpandedMockOutputs((prev) => ({ ...prev, [findingId]: !isExpanded }));

    if (!isExpanded) {
      const mode = mockModes[findingId] || "safe";
      setLoadingMockOutputs((prev) => ({ ...prev, [findingId]: true }));
      try {
        const res = await fetch("/api/ai/mock-output/audit-finding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingId,
            locale: isKo ? "ko" : "en",
            userPrompt: "이 Finding을 설명 요청 계약 기준으로 설명 준비",
            mode,
          }),
        });
        if (!res.ok) {
          throw new Error(`Mock output API error: ${res.status}`);
        }
        const envelope = await res.json();
        if (envelope.status === "error" && !envelope.value) {
          throw new Error(envelope.message || "Failed to fetch mock output");
        }
        if (envelope.value) {
          setMockOutputData((prev) => ({ ...prev, [findingId]: envelope.value.output }));
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingMockOutputs((prev) => ({ ...prev, [findingId]: false }));
      }
    }
  };

  const handleModeChange = async (findingId: string, newMode: any) => {
    setMockModes((prev) => ({ ...prev, [findingId]: newMode }));
    if (expandedMockOutputs[findingId]) {
      setLoadingMockOutputs((prev) => ({ ...prev, [findingId]: true }));
      try {
        const res = await fetch("/api/ai/mock-output/audit-finding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingId,
            locale: isKo ? "ko" : "en",
            userPrompt: "이 Finding을 설명 요청 계약 기준으로 설명 준비",
            mode: newMode,
          }),
        });
        if (!res.ok) {
          throw new Error(`Mock output API error: ${res.status}`);
        }
        const envelope = await res.json();
        if (envelope.value) {
          setMockOutputData((prev) => ({ ...prev, [findingId]: envelope.value.output }));
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingMockOutputs((prev) => ({ ...prev, [findingId]: false }));
      }
    }
  };

  const handleRunReplay = async (findingId: string) => {
    const isExpanded = !!expandedReplayLogs[findingId];
    setExpandedReplayLogs((prev) => ({ ...prev, [findingId]: !isExpanded }));

    if (!isExpanded) {
      setLoadingReplayLogs((prev) => ({ ...prev, [findingId]: true }));
      try {
        const res = await fetch("/api/ai/replay/audit-finding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingId,
            modes: ["safe", "forbidden_wording", "ungrounded_claim", "missing_disclaimer"],
            locale: isKo ? "ko" : "en",
            userPrompt: null,
          }),
        });
        if (!res.ok) {
          throw new Error(`Replay API error: ${res.status}`);
        }
        const envelope = await res.json();
        if (envelope.status === "error" && !envelope.value) {
          throw new Error(envelope.message || "Failed to run replay");
        }
        if (envelope.value && envelope.value.records) {
          setReplayLogData((prev) => ({ ...prev, [findingId]: envelope.value.records }));
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingReplayLogs((prev) => ({ ...prev, [findingId]: false }));
      }
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

  // Filter findings locally
  const filteredFindings = findings.filter((f) => {
    if (sourceTypeFilter !== "all" && f.sourceType !== sourceTypeFilter) return false;
    if (scopeFilter !== "all" && f.scope !== scopeFilter) return false;
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    return true;
  });

  // Calculate counts for badges
  const criticalCount = filteredFindings.filter((f) => f.severity === "critical").length;
  const warningCount = filteredFindings.filter((f) => f.severity === "warning").length;
  const watchCount = filteredFindings.filter((f) => f.severity === "watch").length;
  const infoCount = filteredFindings.filter((f) => f.severity === "info").length;

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-kt-bg-surface-100 border border-kt-border-panel p-4 rounded-kt-card">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-kt-text-primary">
            {isKo ? "통합 감사 Finding (Unified Audit Findings)" : "Unified Audit Findings"}
          </span>
          <p className="text-[11px] text-kt-text-muted leading-relaxed max-w-xl">
            {isKo
              ? "개별 신호 IC, 팩터 상관관계 및 시장 노출도 진단 결과를 종합하여 검토가 필요한 위험 및 경고 항목을 한눈에 조회합니다."
              : "Aggregates results from Individual Signal IC, Factor Correlation, and Market Exposure audits into a unified view of warning diagnostics."}
          </p>
        </div>
        <button
          onClick={handleRefreshFindings}
          disabled={calculating}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-kt-positive hover:bg-kt-positive/90 text-white rounded-kt-pill text-xs font-semibold cursor-pointer disabled:opacity-50 select-none"
        >
          {calculating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{isKo ? "Finding 갱신 중..." : "Refreshing Findings..."}</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isKo ? "감사 Finding 갱신" : "Refresh Findings"}</span>
            </>
          )}
        </button>
      </div>

      {/* Provider Policy Status */}
      <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel/40 rounded-kt-card px-4 py-2.5">
        <button
          onClick={() => setShowProviderStatus((v) => !v)}
          className="flex items-center gap-2 w-full text-left group select-none"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-kt-text-muted group-hover:text-kt-text-secondary" />
          <span className="text-[10px] font-bold text-kt-text-secondary uppercase tracking-wider">
            {isKo ? "Provider 정책 상태" : "Provider Policy Status"}
          </span>
          <span className="ml-auto text-[9px] text-kt-text-muted">
            {showProviderStatus ? (isKo ? "닫기" : "Hide") : (isKo ? "보기" : "Show")}
          </span>
        </button>
        {showProviderStatus && (
          <div className="mt-2.5 border-t border-kt-border-panel/30 pt-2.5 flex flex-wrap gap-2">
            {providerDescriptors.length === 0 ? (
              <span className="text-[9px] text-kt-text-muted">Loading provider status...</span>
            ) : (
              providerDescriptors.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded border border-kt-border-panel/40 bg-kt-bg-overlay-100/60"
                >
                  <span className="text-[9px] font-mono text-kt-text-secondary">{p.id}</span>
                  <span
                    className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                      p.status === "available"
                        ? "bg-kt-positive/10 text-kt-positive-text border border-kt-positive/20"
                        : "bg-kt-bg-overlay-200 text-kt-text-muted border border-kt-border-panel/30"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))
            )}
            <p className="w-full text-[8px] text-kt-text-muted mt-1">
              {isKo
                ? "Mock Provider만 검증 가능. 외부 Provider는 정책상 비활성화 상태입니다."
                : "Only Mock Provider is available. External providers are disabled by policy."}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-kt-negative-weak/10 border border-kt-negative-text/20 rounded-kt-card text-kt-negative-text flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="text-xs">{error}</span>
        </div>
      )}


      {/* Counts dashboard */}
      {findings.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-3 rounded-kt-card flex flex-col justify-between">
            <span className="text-[10px] text-kt-text-secondary font-medium">{isKo ? "Critical 위험" : "Critical"}</span>
            <span
              className={`text-lg font-bold tabular-nums mt-1 ${
                criticalCount > 0 ? "text-kt-negative-text font-extrabold" : "text-kt-text-primary"
              }`}
            >
              {criticalCount}
            </span>
          </div>
          <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-3 rounded-kt-card flex flex-col justify-between">
            <span className="text-[10px] text-kt-text-secondary font-medium">{isKo ? "Warning 경고" : "Warning"}</span>
            <span
              className={`text-lg font-bold tabular-nums mt-1 ${
                warningCount > 0 ? "text-kt-negative-text" : "text-kt-text-primary"
              }`}
            >
              {warningCount}
            </span>
          </div>
          <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-3 rounded-kt-card flex flex-col justify-between">
            <span className="text-[10px] text-kt-text-secondary font-medium">{isKo ? "Watch 관망" : "Watch"}</span>
            <span className="text-lg font-bold tabular-nums text-kt-text-primary mt-1">{watchCount}</span>
          </div>
          <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-3 rounded-kt-card flex flex-col justify-between">
            <span className="text-[10px] text-kt-text-secondary font-medium">{isKo ? "Info 정보" : "Info"}</span>
            <span className="text-lg font-bold tabular-nums text-kt-text-primary mt-1">{infoCount}</span>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      {findings.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap bg-kt-bg-surface-100 border border-kt-border-panel p-3.5 rounded-kt-card">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-kt-text-muted font-medium uppercase">{isKo ? "출처 필터" : "Source Type"}</span>
            <select
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value)}
              className="bg-kt-bg-body border border-kt-border-panel rounded px-3 py-1 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted cursor-pointer font-mono"
            >
              <option value="all">{isKo ? "모두" : "All"}</option>
              <option value="individual_signal_ic">Individual Signal IC</option>
              <option value="factor_correlation">Factor Correlation</option>
              <option value="market_exposure">Market Exposure</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-kt-text-muted font-medium uppercase">{isKo ? "대상 범위" : "Scope"}</span>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="bg-kt-bg-body border border-kt-border-panel rounded px-3 py-1 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted cursor-pointer font-mono"
            >
              <option value="all">{isKo ? "모두" : "All"}</option>
              <option value="signal">Signal</option>
              <option value="factor_pair">Factor Pair</option>
              <option value="trial">Trial</option>
              <option value="universe">Universe</option>
              <option value="strategy">Strategy</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-kt-text-muted font-medium uppercase">{isKo ? "심각도 필터" : "Severity"}</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-kt-bg-body border border-kt-border-panel rounded px-3 py-1 text-xs text-kt-text-primary outline-none focus:border-kt-text-muted cursor-pointer font-mono"
            >
              <option value="all">{isKo ? "모두" : "All"}</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="watch">Watch</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
      )}

      {findings.length === 0 ? (
        <div className="p-12 border border-dashed border-kt-border-panel/80 rounded-kt-card bg-kt-bg-overlay-300/10 flex flex-col items-center justify-center text-center gap-3">
          <Info className="w-8 h-8 text-kt-text-muted opacity-40" />
          <div className="flex flex-col gap-1 max-w-sm">
            <span className="text-xs font-semibold text-kt-text-secondary">
              {isKo ? "검출된 감사 Finding 내역이 없습니다" : "No Audit Findings Found"}
            </span>
            <p className="text-[11px] text-kt-text-muted leading-relaxed">
              {isKo
                ? "상단의 '감사 Finding 갱신' 버튼을 클릭하거나 CLI 스크립트 실행을 통해 감사를 수행하여 최신 Findings 목록을 로드해 주세요."
                : "Please click 'Refresh Findings' or run CLI script to aggregate latest audit findings."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel rounded-kt-card overflow-hidden">
          <div className="px-3 py-2 bg-kt-bg-overlay-100 border-b border-kt-border-panel/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-kt-text-secondary" />
              <span className="text-xs font-bold text-kt-text-primary">{isKo ? "감사 Finding 내역" : "Audit Findings"}</span>
            </div>
            <div className="text-[10px] text-kt-text-muted font-mono">
              Filtered: {filteredFindings.length} / {findings.length} findings
            </div>
          </div>

          <div className="overflow-x-auto font-sans">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="border-b border-kt-border-panel/30 bg-kt-bg-overlay-100 text-kt-text-secondary font-semibold">
                  <th className="py-2.5 px-3 w-20 text-center">{isKo ? "등급" : "Severity"}</th>
                  <th className="py-2.5 px-2 w-24">{isKo ? "범위" : "Scope"}</th>
                  <th className="py-2.5 px-2 w-32">{isKo ? "출처" : "Source Type"}</th>
                  <th className="py-2.5 px-3">{isKo ? "제목 및 진단 요약" : "Title & Summary"}</th>
                  <th className="py-2.5 px-3 w-40">{isKo ? "연동 경고" : "Active Warnings"}</th>
                  <th className="py-2.5 px-3 w-16 text-center">{isKo ? "이동" : "Link"}</th>
                  <th className="py-2.5 px-3 text-right w-36">{isKo ? "감사 시점" : "Calculated At"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kt-border-panel/20 text-kt-text-primary">
                {filteredFindings.map((f) => {
                  let severityBadge = "bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel/40";
                  if (f.severity === "critical" || f.severity === "warning") {
                    severityBadge = "bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative/20 font-bold";
                  } else if (f.severity === "watch") {
                    severityBadge = "bg-kt-bg-panel text-kt-text-secondary border border-kt-border-panel/40";
                  }

                  const isAssetScoped = f.assetId !== null;
                  const isExpanded = !!expandedContextPacks[f.id];
                  const isPromptExpanded = !!expandedPromptInputs[f.id];

                  return (
                    <React.Fragment key={f.id}>
                      <tr className="hover:bg-kt-bg-overlay-100/50 transition-colors">
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] uppercase inline-block ${severityBadge}`}>
                            {f.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-mono font-medium text-kt-text-secondary">
                          {f.scope}
                          {!isAssetScoped && (
                            <div className="text-[8px] text-kt-text-muted mt-0.5 whitespace-nowrap">
                              {isKo ? "(전략/신호 단위)" : "(non-asset)"}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-kt-text-secondary font-mono leading-tight">{f.sourceType}</td>
                        <td className="py-2.5 px-3 space-y-0.5">
                          <div className="font-semibold text-kt-text-primary">{f.title}</div>
                          <p className="text-[10px] text-kt-text-muted leading-normal">{f.summary}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <button
                              onClick={() => handleToggleContextPack(f.id)}
                              className="px-2 py-0.5 bg-kt-bg-overlay-200 hover:bg-kt-bg-overlay-300 text-kt-text-secondary hover:text-kt-text-primary rounded text-[9px] font-semibold cursor-pointer border border-kt-border-panel/40 transition-colors flex items-center gap-1 select-none"
                            >
                              {isExpanded
                                ? isKo
                                  ? "컨텍스트 닫기"
                                  : "Close Context"
                                : isKo
                                ? "검증 컨텍스트 보기"
                                : "View Context"}
                            </button>
                            <button
                              onClick={() => handleTogglePromptInput(f.id)}
                              className="px-2 py-0.5 bg-kt-bg-overlay-200 hover:bg-kt-bg-overlay-300 text-kt-text-secondary hover:text-kt-text-primary rounded text-[9px] font-semibold cursor-pointer border border-kt-border-panel/40 transition-colors flex items-center gap-1 select-none"
                            >
                              {isPromptExpanded
                                ? isKo
                                  ? "요청 닫기"
                                  : "Close Request"
                                : isKo
                                ? "설명 요청 준비"
                                : "Prepare Request"}
                            </button>
                            <div className="flex items-center gap-1 border-l border-kt-border-panel/20 pl-2">
                              <select
                                value={mockModes[f.id] || "safe"}
                                onChange={(e) => handleModeChange(f.id, e.target.value as any)}
                                className="px-1.5 py-0.5 bg-kt-bg-overlay-200 text-kt-text-secondary hover:text-kt-text-primary text-[9px] font-semibold border border-kt-border-panel/40 rounded focus:outline-none focus:border-kt-border-panel select-none cursor-pointer"
                              >
                                <option value="safe">safe</option>
                                <option value="forbidden_wording">forbidden wording</option>
                                <option value="ungrounded_claim">ungrounded claim</option>
                                <option value="missing_disclaimer">missing disclaimer</option>
                              </select>
                              <button
                                onClick={() => handleRunMockOutput(f.id)}
                                className="px-2 py-0.5 bg-kt-bg-overlay-200 hover:bg-kt-bg-overlay-300 text-kt-text-secondary hover:text-kt-text-primary rounded text-[9px] font-semibold cursor-pointer border border-kt-border-panel/40 transition-colors flex items-center gap-1 select-none"
                              >
                                {expandedMockOutputs[f.id]
                                  ? isKo
                                    ? "Mock 설명 닫기"
                                    : "Close Mock"
                                  : isKo
                                  ? "Mock 설명 검증"
                                  : "Verify Mock"}
                              </button>
                              <button
                                onClick={() => handleRunReplay(f.id)}
                                className="px-2 py-0.5 bg-kt-bg-overlay-200 hover:bg-kt-bg-overlay-300 text-kt-text-secondary hover:text-kt-text-primary rounded text-[9px] font-semibold cursor-pointer border border-kt-border-panel/40 transition-colors flex items-center gap-1 select-none"
                              >
                                {expandedReplayLogs[f.id]
                                  ? isKo
                                    ? "리플레이 닫기"
                                    : "Close Replay"
                                  : isKo
                                  ? "Mock 리플레이"
                                  : "Mock Replay"}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {f.warnings.map((w) => (
                              <span
                                key={w}
                                className="px-1 py-0.5 rounded-[3px] text-[8px] font-mono leading-none bg-kt-bg-panel text-kt-text-secondary border border-kt-border-panel/40"
                              >
                                {w}
                              </span>
                            ))}
                            {f.warnings.length === 0 && (
                              <span className="text-kt-text-muted/40 text-[9px] font-mono italic">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {f.internalUrl ? (
                            <Link
                              href={f.internalUrl}
                              className="inline-flex items-center justify-center p-1 hover:bg-kt-bg-overlay-200 rounded text-kt-text-secondary hover:text-kt-text-primary transition-colors cursor-pointer"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <span className="text-kt-text-muted/20">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-kt-text-secondary font-mono text-[9px] whitespace-nowrap">
                          {new Date(f.calculatedAt).toLocaleString()}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-kt-bg-surface-100/10">
                          <td colSpan={7} className="px-4 py-3 border-t border-kt-border-panel/20">
                            <div className="bg-kt-bg-body border border-kt-border-panel rounded p-3 text-[10px] font-mono space-y-2.5 text-kt-text-primary">
                              <div className="flex items-center justify-between border-b border-kt-border-panel/30 pb-1.5">
                                <span className="font-bold text-kt-text-secondary">
                                  AI Context Pack Context (Deterministic Claim Source)
                                </span>
                                <span className="text-[8px] text-kt-text-muted font-bold tracking-wider uppercase">
                                  No LLM Call executed
                                </span>
                              </div>
                              {loadingContextPacks[f.id] ? (
                                <div className="flex items-center gap-1.5 py-1 text-kt-text-muted">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Loading context pack...</span>
                                </div>
                              ) : contextPackData[f.id] ? (
                                <div className="space-y-3.5">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] leading-relaxed">
                                    <div>
                                      <span className="text-kt-text-muted block border-b border-kt-border-panel/20 pb-0.5 mb-1.5 uppercase font-bold text-[9px] tracking-wider">
                                        Source References
                                      </span>
                                      <div className="space-y-1.5">
                                        {contextPackData[f.id].sourceRefs.map((ref, idx) => (
                                          <div
                                            key={idx}
                                            className="bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30 space-y-0.5"
                                          >
                                            <div>
                                              <strong className="text-kt-text-secondary">Source:</strong> {ref.source} (
                                              {ref.sourceType})
                                            </div>
                                            <div>
                                              <strong className="text-kt-text-secondary">Source ID:</strong> {ref.sourceId}
                                            </div>
                                            <div>
                                              <strong className="text-kt-text-secondary">Status:</strong>{" "}
                                              <span className="text-kt-positive-text font-semibold">{ref.status}</span>
                                            </div>
                                            <div>
                                              <strong className="text-kt-text-secondary">Updated At:</strong>{" "}
                                              {ref.updatedAt ? new Date(ref.updatedAt).toLocaleString() : "null"}
                                            </div>
                                            {ref.warnings.length > 0 && (
                                              <div className="text-kt-negative-text font-medium">
                                                <strong className="text-kt-text-secondary">Warnings:</strong>{" "}
                                                {ref.warnings.join(", ")}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-kt-text-muted block border-b border-kt-border-panel/20 pb-0.5 mb-1.5 uppercase font-bold text-[9px] tracking-wider">
                                        Extracted Facts & Scope
                                      </span>
                                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30">
                                        {contextPackData[f.id].facts.map((fact, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between border-b border-kt-border-panel/10 pb-0.5 font-mono text-[9px]"
                                          >
                                            <span className="text-kt-text-secondary font-medium">{fact.key}:</span>
                                            <span className="text-kt-text-primary font-semibold">{String(fact.value)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-kt-text-muted block border-b border-kt-border-panel/20 pb-0.5 mb-1.5 uppercase font-bold text-[9px] tracking-wider">
                                      Freshness & Scope Limitations
                                    </span>
                                    <ul className="list-disc list-inside space-y-1 text-kt-text-secondary leading-relaxed pl-1 text-[9.5px]">
                                      {contextPackData[f.id].limitations.map((lim, idx) => (
                                        <li key={idx}>{lim}</li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="border-t border-kt-border-panel/20 pt-2 flex items-center justify-between text-[8px] text-kt-text-muted">
                                    <span>Created At: {new Date(contextPackData[f.id].createdAt).toLocaleString()}</span>
                                    <span>Intent: {contextPackData[f.id].intent}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-kt-negative-text font-bold">Failed to load context pack data.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      {isPromptExpanded && (
                        <tr className="bg-kt-bg-surface-100/10">
                          <td colSpan={7} className="px-4 py-3 border-t border-kt-border-panel/20">
                            <div className="bg-kt-bg-body border border-kt-border-panel rounded p-3 text-[10px] font-mono space-y-2.5 text-kt-text-primary">
                              <div className="flex items-center justify-between border-b border-kt-border-panel/30 pb-1.5">
                                <span className="font-bold text-kt-text-secondary flex items-center gap-1.5">
                                  <span>AI Prompt Input Contract (Verification & Input Policy)</span>
                                  {cachedBadgeData[f.id] && (
                                    <span className="px-1.5 py-0.5 rounded-[3px] text-[8px] bg-kt-positive/10 text-kt-positive-text border border-kt-positive/20 font-bold uppercase tracking-wider">
                                      {isKo ? "캐시 있음 (Cached)" : "Cached"}
                                    </span>
                                  )}
                                </span>
                                <span className="text-[8px] text-kt-text-muted font-bold tracking-wider uppercase">
                                  No LLM Call executed
                                </span>
                              </div>
                              <div className="p-2 bg-kt-negative-weak/5 border border-kt-negative-text/20 rounded text-[9px] text-kt-negative-text flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span>
                                  {isKo
                                    ? "이 단계는 실제 AI 호출이 아니라, 설명 요청에 필요한 검증 입력을 구성하는 단계입니다."
                                    : "This step does not run a real AI call, but constructs the validated input required for the explanation request."}
                                </span>
                              </div>
                              {loadingPromptInputs[f.id] ? (
                                <div className="flex items-center gap-1.5 py-1 text-kt-text-muted">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Building prompt contract...</span>
                                </div>
                              ) : promptInputData[f.id] ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 leading-relaxed text-[10px]">
                                    <div>
                                      <span className="text-kt-text-muted block border-b border-kt-border-panel/20 pb-0.5 mb-1.5 uppercase font-bold text-[9px] tracking-wider">
                                        System Policy & Forbidden Actions
                                      </span>
                                      <ul className="list-decimal list-inside space-y-1 text-kt-text-secondary leading-normal">
                                        {promptInputData[f.id].systemPolicy.forbiddenActions.map((action, idx) => (
                                          <li key={idx} className="pl-0.5">
                                            {action}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <span className="text-kt-text-muted block border-b border-kt-border-panel/20 pb-0.5 mb-1.5 uppercase font-bold text-[9px] tracking-wider">
                                        Required Disclaimers & Schema
                                      </span>
                                      <div className="space-y-1.5">
                                        <div className="bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30">
                                          <strong className="text-kt-text-secondary block mb-0.5">Disclaimer:</strong>
                                          <span className="text-kt-text-primary leading-normal">
                                            {promptInputData[f.id].systemPolicy.requiredDisclaimers.join(", ") || "-"}
                                          </span>
                                        </div>
                                        <div className="bg-kt-bg-overlay-100 p-1.5 rounded border border-kt-border-panel/30 text-[9px]">
                                          <div>
                                            <strong className="text-kt-text-secondary">Output Schema:</strong>{" "}
                                            {promptInputData[f.id].requiredOutputSchema}
                                          </div>
                                          <div>
                                            <strong className="text-kt-text-secondary">Language:</strong>{" "}
                                            {promptInputData[f.id].systemPolicy.language}
                                          </div>
                                          <div>
                                            <strong className="text-kt-text-secondary">Allowed Claims:</strong>{" "}
                                            {promptInputData[f.id].allowedClaimSourceIds.join(", ") || "-"}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  {promptInputData[f.id].userInstruction && (
                                    <div className="border-t border-kt-border-panel/20 pt-2 text-[10px]">
                                      <strong className="text-kt-text-secondary">User Instruction Hint:</strong>{" "}
                                      <span className="text-kt-text-muted italic">
                                        &quot;{promptInputData[f.id].userInstruction}&quot;
                                      </span>
                                    </div>
                                  )}
                                  <div className="border-t border-kt-border-panel/20 pt-2 flex items-center justify-between text-[8px] text-kt-text-muted">
                                    <span>Contract ID: {promptInputData[f.id].id}</span>
                                    <span>Intent: {promptInputData[f.id].intent}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-kt-negative-text font-bold">Failed to load prompt contract.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      {expandedMockOutputs[f.id] && (
                        <tr className="bg-kt-bg-surface-100/10 border-t border-kt-border-panel/20">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="bg-kt-bg-body border border-kt-border-panel rounded p-3 text-[10px] font-mono space-y-2.5 text-kt-text-primary">
                              <div className="flex items-center justify-between border-b border-kt-border-panel/30 pb-1.5">
                                <span className="font-bold text-kt-text-secondary flex items-center gap-1.5">
                                  <span>AI Explanation Validation Pipeline (Mock)</span>
                                  {mockOutputData[f.id] && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold uppercase tracking-wider border ${
                                        mockOutputData[f.id].isBlocked
                                          ? "bg-kt-negative-weak/10 text-kt-negative-text border-kt-negative-text/20"
                                          : "bg-kt-positive/10 text-kt-positive-text border-kt-positive/20"
                                      }`}
                                    >
                                      {mockOutputData[f.id].isBlocked
                                        ? isKo
                                          ? "차단됨 (Blocked)"
                                          : "Blocked"
                                        : isKo
                                        ? "검증 통과 (Safe)"
                                        : "Safe"}
                                    </span>
                                  )}
                                </span>
                                <span className="text-[8px] text-kt-text-muted font-bold tracking-wider uppercase">
                                  No LLM Call executed
                                </span>
                              </div>

                              {loadingMockOutputs[f.id] ? (
                                <div className="flex items-center gap-1.5 py-1 text-kt-text-muted">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Running output guard pipeline...</span>
                                </div>
                              ) : mockOutputData[f.id] ? (
                                <div className="space-y-3.5">
                                  {mockOutputData[f.id].isBlocked ? (
                                    <div className="space-y-3">
                                      <div className="p-2.5 bg-kt-negative-weak/15 border border-kt-negative-text/30 rounded text-[9.5px] text-kt-negative-text flex items-start gap-2">
                                        <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <div className="space-y-1">
                                          <div className="font-bold">
                                            {isKo
                                              ? "검증 실패로 설명 본문은 표시하지 않습니다."
                                              : "Validation failed. Explanation body is hidden."}
                                          </div>
                                          <div className="text-[9px] opacity-90 leading-normal">
                                            {isKo
                                              ? "출력 가드파이프라인이 비정상 금융 권고 문구, 출처 미정의 클레임, 또는 면책조항 누락을 감지하여 차단 처리했습니다."
                                              : "The output guard pipeline blocked this output due to unauthorized wording, ungrounded claims, or missing disclaimers."}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <span className="text-kt-text-muted block border-b border-kt-border-panel/20 pb-0.5 mb-1.5 uppercase font-bold text-[9px] tracking-wider">
                                            Blocked Reasons
                                          </span>
                                          <ul className="list-disc list-inside space-y-1 text-kt-negative-text/90 pl-1">
                                            {mockOutputData[f.id].blockReasons.map((reason, idx) => (
                                              <li key={idx}>{reason}</li>
                                            ))}
                                          </ul>
                                        </div>
                                        {mockOutputData[f.id].blockedTerms.length > 0 && (
                                          <div>
                                            <span className="text-kt-text-muted block border-b border-kt-border-panel/20 pb-0.5 mb-1.5 uppercase font-bold text-[9px] tracking-wider">
                                              Detected Forbidden Terms
                                            </span>
                                            <div className="flex flex-wrap gap-1">
                                              {mockOutputData[f.id].blockedTerms.map((term) => (
                                                <span
                                                  key={term}
                                                  className="px-1.5 py-0.5 rounded-[3px] text-[8.5px] font-semibold bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative-text/20"
                                                >
                                                  {term}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-3.5">
                                      <div className="space-y-1">
                                        <div className="text-[11px] font-bold text-kt-text-primary border-b border-kt-border-panel/20 pb-1">
                                          {mockOutputData[f.id].title}
                                        </div>
                                        <p className="text-[10px] text-kt-text-secondary leading-relaxed bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30">
                                          {mockOutputData[f.id].summary}
                                        </p>
                                      </div>

                                      <div>
                                        <span className="text-kt-text-muted block border-b border-kt-border-panel/20 pb-0.5 mb-1.5 uppercase font-bold text-[9px] tracking-wider">
                                          Grounded Claims
                                        </span>
                                        <div className="space-y-2">
                                          {mockOutputData[f.id].claims.map((claim) => (
                                            <div
                                              key={claim.id}
                                              className="bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30 space-y-1.5"
                                            >
                                              <div className="text-[9.5px] text-kt-text-primary leading-normal font-sans">
                                                {claim.text}
                                              </div>
                                              <div className="flex flex-wrap gap-x-2 gap-y-1 text-[8px] text-kt-text-muted border-t border-kt-border-panel/10 pt-1">
                                                <span>Source: {claim.source} ({claim.sourceType})</span>
                                                <span>Source ID: {claim.sourceId}</span>
                                                <span>
                                                  Status:{" "}
                                                  <span className="text-kt-positive-text font-semibold">
                                                    {claim.status}
                                                  </span>
                                                </span>
                                                <span>
                                                  Risk:{" "}
                                                  <span
                                                    className={
                                                      claim.riskLevel === "low"
                                                        ? "text-kt-positive-text font-semibold"
                                                        : "text-kt-negative-text font-semibold"
                                                    }
                                                  >
                                                    {claim.riskLevel}
                                                  </span>
                                                </span>
                                                {claim.updatedAt && (
                                                  <span>
                                                    Updated: {new Date(claim.updatedAt).toLocaleString()}
                                                  </span>
                                                )}
                                              </div>
                                              {claim.warnings.length > 0 && (
                                                <div className="text-[8px] text-kt-negative-text font-semibold">
                                                  Warnings: {claim.warnings.join(", ")}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <span className="text-kt-text-muted block border-b border-kt-border-panel/20 pb-0.5 mb-1.5 uppercase font-bold text-[9px] tracking-wider">
                                            Required Disclaimers
                                          </span>
                                          <div className="bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30 text-[9px] text-kt-text-secondary leading-normal">
                                            {mockOutputData[f.id].requiredDisclaimers.join(", ") || "-"}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-kt-text-muted block border-b border-kt-border-panel/20 pb-0.5 mb-1.5 uppercase font-bold text-[9px] tracking-wider">
                                            Limitations
                                          </span>
                                          <ul className="list-disc list-inside space-y-0.5 text-[9px] text-kt-text-secondary pl-1 leading-normal">
                                            {mockOutputData[f.id].limitations.map((lim, idx) => (
                                              <li key={idx}>{lim}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="border-t border-kt-border-panel/20 pt-2 flex items-center justify-between text-[8px] text-kt-text-muted font-mono">
                                    <span>Explanation ID: {mockOutputData[f.id].id}</span>
                                    <span>Generated At: {new Date(mockOutputData[f.id].generatedAt).toLocaleString()}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-kt-negative-text font-bold">Failed to load mock explanation output.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      {expandedReplayLogs[f.id] && (
                        <tr className="bg-kt-bg-surface-100/10 border-t border-kt-border-panel/20">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="bg-kt-bg-body border border-kt-border-panel rounded p-3 text-[10px] font-mono space-y-2.5 text-kt-text-primary">
                              <div className="flex items-center justify-between border-b border-kt-border-panel/30 pb-1.5">
                                <span className="font-bold text-kt-text-secondary">
                                  AI Safety & Alignment Regression Replay Ledger (E2E Validation Checks)
                                </span>
                                <span className="text-[8px] text-kt-text-muted font-bold tracking-wider uppercase">
                                  Goldens Regression Suite
                                </span>
                              </div>

                              {loadingReplayLogs[f.id] ? (
                                <div className="flex items-center gap-1.5 py-1 text-kt-text-muted">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Running safety goldens replay regression suite...</span>
                                </div>
                              ) : replayLogData[f.id] ? (
                                <div className="space-y-3">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                      <thead>
                                        <tr className="border-b border-kt-border-panel/30 text-kt-text-muted text-[8px] uppercase tracking-wider">
                                          <th className="py-1.5 pr-2">Mode</th>
                                          <th className="py-1.5 px-2">Expected Blocked</th>
                                          <th className="py-1.5 px-2">Actual Blocked</th>
                                          <th className="py-1.5 px-2">Outcome</th>
                                          <th className="py-1.5 px-2">Passed</th>
                                          <th className="py-1.5 pl-2">Failure Reasons</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {replayLogData[f.id].map((record) => (
                                          <tr
                                            key={record.mode}
                                            className="border-b border-kt-border-panel/10 hover:bg-kt-bg-overlay-100/50"
                                          >
                                            <td className="py-1.5 pr-2 font-bold text-kt-text-primary">
                                              {record.mode}
                                            </td>
                                            <td className="py-1.5 px-2 text-kt-text-secondary">
                                              {String(record.expectedBlocked)}
                                            </td>
                                            <td className="py-1.5 px-2 text-kt-text-secondary">
                                              {String(record.actualBlocked)}
                                            </td>
                                            <td className="py-1.5 px-2">
                                              <span
                                                className={`px-1 py-0.5 rounded text-[8px] font-semibold ${
                                                  record.outcome === "passed"
                                                    ? "bg-kt-positive/10 text-kt-positive-text border border-kt-positive/20"
                                                    : record.outcome === "blocked"
                                                    ? "bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative-text/20"
                                                    : "bg-kt-negative-weak/20 text-kt-negative-text font-bold"
                                                }`}
                                              >
                                                {record.outcome}
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-2">
                                              <span
                                                className={
                                                  record.passed
                                                    ? "text-kt-positive-text font-bold"
                                                    : "text-kt-negative-text font-bold"
                                                }
                                              >
                                                {record.passed ? "✔" : "✘"}
                                              </span>
                                            </td>
                                            <td className="py-1.5 pl-2 text-kt-negative-text text-[9px] max-w-[200px] truncate">
                                              {record.failureReasons.join(", ") || "-"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="border-t border-kt-border-panel/20 pt-2 flex items-center justify-between text-[8px] text-kt-text-muted">
                                    <span>Ledger Records Saved: data/ai/explanation-replay-ledger/</span>
                                    <span>Engine: 1.0.0-mock</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-kt-negative-text font-bold">Failed to load replay ledger log.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
