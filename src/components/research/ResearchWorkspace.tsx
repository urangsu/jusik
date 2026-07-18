import React, { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { MethodRulePanel } from "./MethodRulePanel";
import { SupplyChainEvidencePanel } from "./SupplyChainEvidencePanel";
import { ThesisPillarPanel } from "./ThesisPillarPanel";
import { ResearchValidationPanel } from "./ResearchValidationPanel";
import { ResearchVoiceTimeline } from "./ResearchVoiceTimeline";
import { EvidenceDrawer } from "./EvidenceDrawer";
import type { ResearchClaim } from "@/domain/research/research-claim";
import type { ResearchDiagnosticData } from "@/server/research/research-workspace-service";
import type { DataEnvelope } from "@/domain/common/data-status";

type ResearchDiagnosticEnvelope = DataEnvelope<ResearchDiagnosticData | null>;

interface ResearchWorkspaceProps {
  assetId: string | null;
  asOfDate?: string;
  /** Must be provided explicitly — never inferred from assetId. */
  universeId: string | null;
}

export const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({ assetId, asOfDate, universeId }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<ResearchDiagnosticData | null>(null);
  const [status, setStatus] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [selectedClaim, setSelectedClaim] = useState<ResearchClaim | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Reset immediately on asset switch — prevents stale data flash
    setData(null);
    setStatus("");
    setMessage("");
    setSelectedClaim(null);

    if (!assetId || !universeId) {
      setStatus("insufficient_data");
      setMessage("종목 또는 유니버스 정보가 없어 리서치 데이터를 불러올 수 없습니다.");
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const dateParam = asOfDate ?? new Date().toISOString().slice(0, 10);
    const url = `/api/research/assets/${encodeURIComponent(assetId)}?asOfDate=${dateParam}&universeId=${encodeURIComponent(universeId)}`;

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((envelope: ResearchDiagnosticEnvelope) => {
        if (controller.signal.aborted) return;
        setStatus(envelope.status);
        setMessage((envelope as any).message ?? "");
        const validStatuses = new Set(["cached", "real_time", "delayed", "eod", "stale"]);
        if (validStatuses.has(envelope.status) && envelope.value) {
          setData(envelope.value);
        } else {
          setData(null);
        }
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        console.error("Failed to fetch research diagnostics:", err);
        setStatus("error");
        setMessage("리서치 워크스페이스 데이터를 불러오는 도중 오류가 발생했습니다.");
        setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [assetId, asOfDate, universeId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-kt-text-muted">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>진단 데이터 분석 중...</span>
      </div>
    );
  }

  if (!assetId || !universeId || status === "insufficient_data" || status === "error" || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-kt-bg-surface-200 border border-kt-border-panel/40 rounded-kt-card max-w-xl mx-auto select-none my-8 text-xs">
        <AlertCircle className="w-8 h-8 text-kt-text-muted mb-3" />
        <h3 className="text-sm font-bold text-kt-text-primary uppercase tracking-wide">데이터 부족</h3>
        <p className="mt-2 text-kt-text-muted leading-relaxed">
          {message || "공식 자료 또는 사용자 제공 리서치 기록이 연결되지 않았습니다."}
        </p>
        <div className="mt-4 border-t border-kt-border-panel/20 pt-3 text-[10px] text-kt-text-muted leading-relaxed">
          현재 화면은 투자 판단이 아니라 근거 검증 상태를 표시합니다.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 relative select-none">
      {/* Stale data warning banner */}
      {status === "stale" && (
        <div className="flex items-center gap-2 bg-kt-bg-surface-200 border border-kt-border-panel/40 rounded px-4 py-2.5 text-kt-text-secondary text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>표시된 데이터가 최신이 아닐 수 있습니다 (stale). 데이터 원천을 직접 확인하세요.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Side: Multiseat validation and Thesis Pillars */}
        <div className="flex flex-col gap-6">
          <ResearchValidationPanel validationResult={data.validationResult} />
          <ThesisPillarPanel
            pillars={data.thesisSnapshot.pillars}
            claims={data.claims}
            onClaimSelect={(claim: ResearchClaim) => setSelectedClaim(claim)}
          />
        </div>

        {/* Right Side: Method Rules, Supply Chain, Voice Timeline */}
        <div className="flex flex-col gap-6">
          <MethodRulePanel evaluations={data.evaluations} />
          {/*
            graph prop receives the real supply chain graph (or null).
            When null, the panel shows an "unavailable" empty state.
            No mock graph is ever generated here.
          */}
          <SupplyChainEvidencePanel graph={data.supplyChainGraph} />
          <ResearchVoiceTimeline timeline={data.voiceTimeline} />
        </div>
      </div>

      {/* Slide-out Evidence details drawer */}
      <EvidenceDrawer
        claim={selectedClaim}
        evidenceRecords={data.evidenceRecords}
        onClose={() => setSelectedClaim(null)}
      />
    </div>
  );
};
