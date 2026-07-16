import React from "react";
import { Circle, FileText, ArrowUpRight, Flame, CloudOff, RefreshCw, Layers } from "lucide-react";
import { Panel } from "../ui/Panel";
import type { ThesisPillar } from "@/domain/research/thesis-pillar";
import type { ResearchClaim } from "@/domain/research/research-claim";

interface ThesisPillarPanelProps {
  pillars: ThesisPillar[];
  claims: ResearchClaim[];
  onClaimSelect: (claim: ResearchClaim) => void;
}

export const ThesisPillarPanel: React.FC<ThesisPillarPanelProps> = ({ pillars, claims, onClaimSelect }) => {
  const getStatusBadge = (status: ThesisPillar["status"]) => {
    switch (status) {
      case "confirming":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-positive-text bg-kt-positive-weak px-2 py-0.5 rounded border border-kt-positive/20">
            <RefreshCw className="w-3 h-3 animate-spin-slow" /> CONFIRMING
          </span>
        );
      case "mixed":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-text-secondary bg-kt-bg-overlay-200 px-2 py-0.5 rounded border border-kt-border-panel/30">
            MIXED
          </span>
        );
      case "deteriorating":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-negative-text bg-kt-negative-weak px-2 py-0.5 rounded border border-kt-negative-text/20">
            <Flame className="w-3.5 h-3.5" /> DETERIORATING
          </span>
        );
      case "stale":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-text-muted bg-kt-bg-overlay-100 px-2 py-0.5 rounded border border-kt-border-panel/20">
            <CloudOff className="w-3.5 h-3.5" /> STALE
          </span>
        );
      case "unverified":
      default:
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-text-muted bg-kt-bg-overlay-100 px-2 py-0.5 rounded border border-kt-border-panel/10">
            UNVERIFIED
          </span>
        );
    }
  };

  return (
    <Panel title="투자 가설 핵심 기둥 (Thesis Pillars)" headerAction={<Layers className="w-4 h-4 text-kt-text-muted" />}>
      <div className="flex flex-col gap-4 text-xs">
        <div className="text-[11px] text-kt-text-muted leading-relaxed">
          검증 방법론에 연동된 핵심 투자 가설(Pillars)입니다. 각 가설을 증명하는 리서치 클레임 목록을 선택하면 원천 증거와 span 정보를 확인하실 수 있습니다.
        </div>

        <div className="flex flex-col gap-3">
          {pillars.map((pillar) => {
            return (
              <div
                key={pillar.pillarId}
                className="bg-kt-bg-surface-200/50 border border-kt-border-panel/40 rounded-kt-card p-4 flex flex-col gap-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-kt-text-primary">{pillar.title}</span>
                    {pillar.corePillar && (
                      <span className="text-[8px] font-bold text-kt-positive-text bg-kt-positive-weak px-1 rounded mt-0.5 w-max">
                        CORE PILLAR (핵심 기둥)
                      </span>
                    )}
                  </div>
                  {getStatusBadge(pillar.status)}
                </div>

                {/* Evidence Counts */}
                <div className="grid grid-cols-2 gap-3 text-[10px] font-mono border-t border-b border-kt-border-panel/20 py-2">
                  <div className="flex justify-between">
                    <span className="text-kt-text-muted">Confirming Ev (긍정 증거)</span>
                    <span className="font-bold text-kt-positive-text tabular-nums">{pillar.confirmingEvidenceIds.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-kt-text-muted">Contradicting Ev (반박 증거)</span>
                    <span className="font-bold text-kt-negative-text tabular-nums">{pillar.contradictingEvidenceIds.length}</span>
                  </div>
                </div>

                {/* Claims linked to this pillar */}
                {pillar.claimIds.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-kt-text-muted uppercase tracking-wider block mb-1.5">
                      연동된 리서치 의견 (Claims)
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {pillar.claimIds.map((claimId) => {
                        const claimObj = claims.find((c) => c.claimId === claimId);
                        if (!claimObj) return null;

                        return (
                          <button
                            key={claimId}
                            onClick={() => onClaimSelect(claimObj)}
                            className="w-full text-left p-2.5 rounded bg-kt-bg-overlay-100/50 hover:bg-kt-bg-overlay-100 border border-kt-border-panel/20 flex items-center justify-between gap-3 cursor-pointer group text-[11px]"
                          >
                            <span className="text-kt-text-primary group-hover:text-kt-text-primary line-clamp-1">
                              {claimObj.text}
                            </span>
                            <span className="flex items-center gap-1 text-[9px] text-kt-text-muted shrink-0">
                              <span>세부정보</span>
                              <ArrowUpRight className="w-3 h-3 group-hover:text-kt-text-primary transition-colors" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
};
