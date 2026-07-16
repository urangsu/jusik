import React from "react";
import { X, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import type { ResearchClaim } from "@/domain/research/research-claim";

interface EvidenceDrawerProps {
  claim: ResearchClaim | null;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ claim, onClose }) => {
  if (!claim) return null;

  const isAiExtracted = claim.extractionMethod === "ai_extraction";

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-kt-border-panel/40 bg-kt-bg-surface-100/95 backdrop-blur-md p-6 flex flex-col gap-6 text-xs text-kt-text-secondary select-none">
      <div className="flex items-center justify-between border-b border-kt-border-panel/30 pb-3">
        <h3 className="text-sm font-bold text-kt-text-primary">근거 세부 정보 (Evidence Details)</h3>
        <button onClick={onClose} className="p-1 hover:bg-kt-bg-overlay-100 rounded text-kt-text-muted hover:text-kt-text-primary cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto pr-1">
        <div>
          <span className="text-[10px] text-kt-text-muted uppercase tracking-wider">Claim ID</span>
          <p className="font-mono text-kt-text-primary">{claim.claimId}</p>
        </div>

        <div>
          <span className="text-[10px] text-kt-text-muted uppercase tracking-wider">내용 (Claim Text)</span>
          <p className="mt-1 text-sm font-medium text-kt-text-primary bg-kt-bg-overlay-100 p-3 rounded-kt-card border border-kt-border-panel/30">
            {claim.text}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] text-kt-text-muted uppercase tracking-wider">방향 (Direction)</span>
            <p className="mt-1">
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                claim.direction === "bullish"
                  ? "text-kt-positive-text bg-kt-positive-weak border-kt-positive/20"
                  : claim.direction === "bearish"
                  ? "text-kt-negative-text bg-kt-negative-weak border-kt-negative-text/20"
                  : "text-kt-text-muted bg-kt-bg-overlay-100 border-kt-border-panel/20"
              }`}>
                {claim.direction.toUpperCase()}
              </span>
            </p>
          </div>

          <div>
            <span className="text-[10px] text-kt-text-muted uppercase tracking-wider">클레임 종류 (Kind)</span>
            <p className="mt-1 font-mono text-kt-text-primary">{claim.claimKind}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] text-kt-text-muted uppercase tracking-wider">추출 방식 (Extraction)</span>
            <p className="mt-1 font-semibold text-kt-text-primary uppercase">{claim.extractionMethod}</p>
          </div>

          <div>
            <span className="text-[10px] text-kt-text-muted uppercase tracking-wider">검증 여부 (Verified)</span>
            <p className="mt-1 flex items-center gap-1">
              {claim.isVerified ? (
                <span className="flex items-center gap-1 text-kt-positive-text bg-kt-positive-weak px-1.5 py-0.5 rounded text-[10px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED
                </span>
              ) : (
                <span className="text-kt-text-muted bg-kt-bg-overlay-100 px-1.5 py-0.5 rounded text-[10px]">
                  UNVERIFIED
                </span>
              )}
            </p>
          </div>
        </div>

        {claim.evidenceSpan && (
          <div>
            <span className="text-[10px] text-kt-text-muted uppercase tracking-wider">증거 대상 기간 (Evidence Span)</span>
            <p className="mt-1 font-mono text-kt-text-primary">
              {claim.evidenceSpan.from} ~ {claim.evidenceSpan.to}
            </p>
          </div>
        )}

        {isAiExtracted && (
          <div className="bg-kt-negative-weak/10 border border-kt-negative-text/20 rounded p-3 text-kt-negative-text flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">AI 추출 자료 - 원천 출처 검증 필요</span>
              <span className="text-[10px]">본 내용은 기계 추출 내용이므로 반드시 원문 및 공식 채널을 대조하여 검증하십시오.</span>
            </div>
          </div>
        )}

        {claim.evidenceIds.length > 0 && (
          <div>
            <span className="text-[10px] text-kt-text-muted uppercase tracking-wider">관련 증거 일련번호 (Evidence IDs)</span>
            <ul className="mt-1.5 flex flex-col gap-1.5 font-mono">
              {claim.evidenceIds.map((evId) => (
                <li key={evId} className="flex items-center justify-between bg-kt-bg-overlay-100 px-3 py-1.5 rounded border border-kt-border-panel/20">
                  <span className="text-kt-text-primary">{evId}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
