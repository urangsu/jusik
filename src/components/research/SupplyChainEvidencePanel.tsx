import React from "react";
import { ArrowRight, Link, ShieldCheck, HelpCircle, AlertTriangle } from "lucide-react";
import { Panel } from "../ui/Panel";
import type { SupplyChainGraph, SupplyChainNode, SupplyChainEdge } from "@/domain/research/supply-chain-graph";

interface SupplyChainEvidencePanelProps {
  graph: SupplyChainGraph | null;
}

export const SupplyChainEvidencePanel: React.FC<SupplyChainEvidencePanelProps> = ({ graph }) => {
  if (!graph || graph.nodes.length === 0) {
    return (
      <Panel title="공급망 경로 분석 (Supply Chain Analysis)">
        <div className="bg-kt-bg-overlay-100 p-4 rounded-kt-card border border-kt-border-panel/30 text-center text-kt-text-muted">
          표시할 활성화된 공급망 경로 정보가 존재하지 않습니다.
        </div>
      </Panel>
    );
  }

  const getNodeColorClass = (type: SupplyChainNode["nodeType"]) => {
    switch (type) {
      case "listed_asset":
        return "border-kt-positive/30 bg-kt-positive-weak/5 text-kt-positive-text";
      case "demand_driver":
      case "customer":
        return "border-kt-border-panel/40 bg-kt-bg-overlay-200/50 text-kt-text-primary";
      default:
        return "border-kt-border-panel/20 bg-kt-bg-overlay-100/30 text-kt-text-secondary";
    }
  };

  const getEdgeStyle = (state: SupplyChainEdge["evidenceState"]) => {
    switch (state) {
      case "verified":
        return {
          borderClass: "border-kt-positive/30 bg-kt-positive-weak/5",
          label: "Verified (검증됨)",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-kt-positive-text" />,
        };
      case "inferred":
        return {
          borderClass: "border-kt-border-panel bg-kt-bg-overlay-200/50 border-dashed",
          label: "Inferred (추정됨)",
          icon: <Link className="w-3.5 h-3.5 text-kt-text-secondary" />,
        };
      case "hypothesis":
        return {
          borderClass: "border-kt-border-panel/30 bg-kt-bg-overlay-100/30 border-dotted",
          label: "Hypothesis (가설)",
          icon: <HelpCircle className="w-3.5 h-3.5 text-kt-text-muted" />,
        };
      case "contradicted":
      default:
        return {
          borderClass: "border-kt-negative-text/20 bg-kt-negative-weak/10",
          label: "Contradicted (반박됨)",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-kt-negative-text" />,
        };
    }
  };

  return (
    <Panel title="공급망 경로 분석 (Supply Chain Analysis)">
      <div className="flex flex-col gap-4 text-xs">
        <div className="text-[11px] text-kt-text-muted">
          공급망 노드 간의 의존 관계 및 원천 근거 상태입니다. 점선이나 반박된 경로는 밸류체인 판정 우선 순위에서 제외됩니다.
        </div>

        {/* Laying out nodes and edges as accessible HTML lists/cards */}
        <div className="flex flex-col gap-3">
          {graph.edges.map((edge) => {
            const fromNode = graph.nodes.find((n) => n.nodeId === edge.fromNodeId);
            const toNode = graph.nodes.find((n) => n.nodeId === edge.toNodeId);
            if (!fromNode || !toNode) return null;

            const edgeMeta = getEdgeStyle(edge.evidenceState);

            return (
              <div
                key={edge.edgeId}
                className="bg-kt-bg-surface-200/50 border border-kt-border-panel/40 rounded-kt-card p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Upstream / Source Node */}
                <div className={`flex-1 p-2 rounded border font-mono ${getNodeColorClass(fromNode.nodeType)}`}>
                  <div className="text-[9px] text-kt-text-muted uppercase font-bold tracking-wider">{fromNode.nodeType}</div>
                  <div className="font-semibold text-xs mt-0.5">{fromNode.label}</div>
                  {fromNode.assetId && <div className="text-[9px] text-kt-text-muted mt-0.5">{fromNode.assetId}</div>}
                </div>

                {/* Connection Edge */}
                <div className={`flex flex-col items-center justify-center px-4 py-2 rounded border gap-1 min-w-[140px] text-center ${edgeMeta.borderClass}`}>
                  <div className="flex items-center gap-1.5 font-bold uppercase text-[9px] text-kt-text-primary">
                    {edgeMeta.icon}
                    <span>{edgeMeta.label}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-kt-text-muted">
                    <span>{edge.relationship.toUpperCase()}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  {edge.evidenceIds.length > 0 && (
                    <div className="text-[9px] text-kt-text-muted font-mono leading-none mt-0.5">
                      Ev: {edge.evidenceIds.join(", ")}
                    </div>
                  )}
                </div>

                {/* Downstream / Target Node */}
                <div className={`flex-1 p-2 rounded border font-mono ${getNodeColorClass(toNode.nodeType)}`}>
                  <div className="text-[9px] text-kt-text-muted uppercase font-bold tracking-wider">{toNode.nodeType}</div>
                  <div className="font-semibold text-xs mt-0.5">{toNode.label}</div>
                  {toNode.assetId && <div className="text-[9px] text-kt-text-muted mt-0.5">{toNode.assetId}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
};
