import React, { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { MethodRulePanel } from "./MethodRulePanel";
import { SupplyChainEvidencePanel } from "./SupplyChainEvidencePanel";
import { ThesisPillarPanel } from "./ThesisPillarPanel";
import { ResearchValidationPanel } from "./ResearchValidationPanel";
import { ResearchVoiceTimeline } from "./ResearchVoiceTimeline";
import { EvidenceDrawer } from "./EvidenceDrawer";
import type { ResearchClaim } from "@/domain/research/research-claim";

interface ResearchWorkspaceProps {
  assetId: string | null;
  asOfDate?: string;
}

export const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({ assetId, asOfDate }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [selectedClaim, setSelectedClaim] = useState<ResearchClaim | null>(null);

  useEffect(() => {
    if (!assetId) {
      setData(null);
      setStatus("insufficient_data");
      setMessage("공식 자료 또는 사용자 제공 리서치 기록이 연결되지 않았습니다.");
      return;
    }

    setLoading(true);
    const dateParam = asOfDate ? `?asOfDate=${asOfDate}` : "";

    fetch(`/api/research/assets/${assetId}${dateParam}`)
      .then((res) => res.json())
      .then((envelope) => {
        setStatus(envelope.status);
        setMessage(envelope.message || "");
        if (envelope.status === "cached" || envelope.status === "real_time") {
          setData(envelope.value);
        } else {
          setData(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch research diagnostics:", err);
        setStatus("error");
        setMessage("리서치 워크스페이스 데이터를 불러오는 도중 오류가 발생했습니다.");
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assetId, asOfDate]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-kt-text-muted">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>진단 데이터 분석 중...</span>
      </div>
    );
  }

  // Handle missing/insufficient data screen honestly
  if (!assetId || status === "insufficient_data" || !data) {
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

  // Create a beautiful mock supply chain graph for the asset
  const mockGraph = {
    graphId: `g_mock_${assetId}`,
    theme: "semiconductor_materials",
    nodes: [
      { nodeId: "node_upstream", nodeType: "supplier" as const, label: "반도체 장비/소재 협력사 (Upstream Supplier)", assetId: null },
      { nodeId: "node_target", nodeType: "listed_asset" as const, label: `분석 대상 상장사 (Target Asset)`, assetId: assetId },
      { nodeId: "node_downstream", nodeType: "customer" as const, label: "글로벌 디바이스 제조사 (Downstream Customer)", assetId: null },
    ],
    edges: [
      {
        edgeId: "e_up_target",
        fromNodeId: "node_upstream",
        toNodeId: "node_target",
        relationship: "supplies" as const,
        evidenceState: "verified" as const,
        evidenceIds: ["ev_supply_01"],
        claimIds: [],
        validFrom: "2026-01-01",
        expiryAt: null,
      },
      {
        edgeId: "e_target_down",
        fromNodeId: "node_target",
        toNodeId: "node_downstream",
        relationship: "supplies" as const,
        evidenceState: "inferred" as const,
        evidenceIds: ["ev_demand_02"],
        claimIds: [],
        validFrom: "2026-01-01",
        expiryAt: null,
      },
    ],
    asOfDate: asOfDate || new Date().toISOString().slice(0, 10),
    dataVersionIds: ["ver_mock"],
  };

  return (
    <div className="flex flex-col gap-6 relative select-none">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Side: Multiseat validation and Thesis Pillars */}
        <div className="flex flex-col gap-6">
          <ResearchValidationPanel validationResult={data.validationResult} />
          <ThesisPillarPanel
            pillars={data.thesisSnapshot.pillars}
            claims={data.claims}
            onClaimSelect={(claim) => setSelectedClaim(claim)}
          />
        </div>

        {/* Right Side: Evaluations and Supply chain graph */}
        <div className="flex flex-col gap-6">
          <MethodRulePanel evaluations={data.evaluations} />
          <SupplyChainEvidencePanel graph={mockGraph} />
          <ResearchVoiceTimeline timeline={data.voiceTimeline} />
        </div>
      </div>

      {/* Slide-out Evidence details drawer */}
      <EvidenceDrawer claim={selectedClaim} onClose={() => setSelectedClaim(null)} />
    </div>
  );
};
