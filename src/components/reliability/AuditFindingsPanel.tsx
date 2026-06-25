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
import { AiContextPack } from "@/server/ai/ai-context-pack-builder";

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
