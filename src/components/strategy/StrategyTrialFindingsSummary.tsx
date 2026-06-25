"use client";

import React, { useEffect, useState } from "react";
import { AuditFinding } from "@/domain/audit/audit-finding";
import { DataEnvelope } from "@/domain/common/data-status";
import { useI18n } from "@/i18n/use-i18n";
import { Info, ShieldAlert, AlertTriangle } from "lucide-react";

type Props = {
  trialId: string;
  strategyId: string;
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
};

export default function StrategyTrialFindingsSummary({ trialId, strategyId, universeId }: Props) {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<AuditFinding[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const loadFindings = async () => {
      try {
        // 1. Try fetching by trialId
        const res1 = await fetch(`/api/audit/findings?trialId=${trialId}`);
        if (!res1.ok) {
          throw new Error(`API error: ${res1.status}`);
        }
        const envelope1: DataEnvelope<AuditFinding[]> = await res1.json();
        if (envelope1.status === "error") {
          throw new Error(envelope1.message || "Failed to fetch findings");
        }

        let results = envelope1.value || [];

        // 2. If no findings for trialId, fallback to strategyId + universeId
        if (results.length === 0) {
          const res2 = await fetch(`/api/audit/findings?strategyId=${strategyId}&universeId=${universeId}`);
          if (res2.ok) {
            const envelope2: DataEnvelope<AuditFinding[]> = await res2.json();
            if (envelope2.status !== "error") {
              results = envelope2.value || [];
            }
          }
        }

        if (active) {
          setFindings(results);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || String(err));
          setLoading(false);
        }
      }
    };

    loadFindings();

    return () => {
      active = false;
    };
  }, [trialId, strategyId, universeId]);

  if (loading) {
    return (
      <div className="p-4 bg-kt-bg-panel/40 border border-kt-border-panel/40 rounded-kt-card animate-pulse">
        <div className="h-4 bg-kt-bg-overlay-300 w-1/4 rounded mb-4" />
        <div className="h-12 bg-kt-bg-overlay-300 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-kt-bg-panel/40 border border-kt-border-panel/40 rounded-kt-card text-kt-negative-text flex items-center gap-2">
        <ShieldAlert className="w-4 h-4" />
        <span className="text-xs">오류: {error}</span>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="p-4 bg-kt-bg-panel/40 border border-kt-border-panel/40 rounded-kt-card text-kt-text-secondary flex items-center gap-2 text-xs">
        <Info className="w-4 h-4 text-kt-text-secondary/60" />
        <span>
          {isKo
            ? "해당 전략에 감지된 경고성 감사 Finding이 없습니다."
            : "No warning audit findings detected for this strategy trial."}
        </span>
      </div>
    );
  }

  // Categorize findings
  const exposureFindings = findings.filter((f) => f.sourceType === "market_exposure");
  const icFindings = findings.filter((f) => f.sourceType === "individual_signal_ic");
  const corrFindings = findings.filter((f) => f.sourceType === "factor_correlation");

  const renderFindingList = (list: AuditFinding[], sectionTitle: string) => {
    if (list.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-kt-text-secondary uppercase tracking-wider">{sectionTitle}</h4>
        <div className="space-y-1.5">
          {list.map((f) => {
            let sevBadge = "bg-kt-bg-overlay-300 text-kt-text-secondary border border-kt-border-panel/40";
            if (f.severity === "critical" || f.severity === "warning") {
              // KR finance convention warnings/errors in Blue (하락/부정)
              sevBadge = "bg-kt-negative-weak/10 text-kt-negative-text border border-kt-negative/20";
            }

            const isAssetNull = f.assetId === null;

            return (
              <div key={f.id} className="p-2.5 bg-kt-bg-surface-200/40 rounded border border-kt-border-panel/20 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-1 py-0.5 rounded-[3px] text-[8px] font-mono leading-none uppercase font-semibold ${sevBadge}`}>
                      {f.severity}
                    </span>
                    <span className="text-xs font-semibold text-kt-text-primary">{f.title}</span>
                  </div>
                  {isAssetNull && (
                    <span className="px-1.5 py-0.5 rounded bg-kt-bg-panel text-kt-text-secondary border border-kt-border-panel/40 text-[8px] font-mono font-medium">
                      {isKo ? "전략/신호 단위 진단" : "Universe/Signal Scope"}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-kt-text-secondary leading-normal">{f.summary}</p>
                {f.warnings.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {f.warnings.map((w) => (
                      <span key={w} className="px-1 py-0.5 text-[8px] font-mono bg-kt-bg-body text-kt-text-secondary rounded border border-kt-border-panel/10">
                        {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderFindingList(exposureFindings, isKo ? "시장 노출도 진단 (Market Exposure)" : "Market Exposure")}
      {renderFindingList(icFindings, isKo ? "신호 IC 진단 (Individual Signal IC)" : "Individual Signal IC")}
      {renderFindingList(corrFindings, isKo ? "팩터 상관관계 진단 (Factor Correlation)" : "Factor Correlation")}
    </div>
  );
}
