import React from "react";
import { X, ExternalLink, ShieldCheck, AlertCircle, FileText, Calendar, Tag } from "lucide-react";
import type { ResearchClaim } from "@/domain/research/research-claim";
import type { ResearchEvidenceRecord } from "@/domain/research/research-evidence-record";

interface EvidenceDrawerProps {
  claim: ResearchClaim | null;
  evidenceRecords: ResearchEvidenceRecord[];
  onClose: () => void;
}

const VERIFICATION_LABEL: Record<ResearchEvidenceRecord["verificationStatus"], string> = {
  verified: "검증 완료",
  unverified: "미검증",
  stale: "기간 만료",
  rejected: "거부됨",
};

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ claim, evidenceRecords, onClose }) => {
  if (!claim) return null;

  const isAiExtracted = claim.extractionMethod === "ai_extraction";

  // Find evidence records that correspond to this claim's evidenceIds
  const linkedRecords = evidenceRecords.filter((r) =>
    claim.evidenceIds.includes(r.evidenceId)
  );
  const unresolvedIds = claim.evidenceIds.filter(
    (id) => !linkedRecords.some((r) => r.evidenceId === id)
  );

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
              {claim.evidenceIds.length > 0 &&
              claim.evidenceIds.every((id) => {
                const rec = evidenceRecords.find((r) => r.evidenceId === id);
                return rec?.verificationStatus === "verified";
              }) ? (
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

        {/* ── Linked Evidence Records (actual provenance) ── */}
        {linkedRecords.length > 0 && (
          <div>
            <span className="text-[10px] text-kt-text-muted uppercase tracking-wider">연결된 증거 출처 (Evidence Sources)</span>
            <ul className="mt-1.5 flex flex-col gap-2">
              {linkedRecords.map((rec) => (
                <li key={rec.evidenceId} className="bg-kt-bg-overlay-100 border border-kt-border-panel/20 rounded p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-kt-text-primary text-[11px] leading-snug">{rec.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      rec.verificationStatus === "verified"
                        ? "text-kt-positive-text bg-kt-positive-weak"
                        : rec.verificationStatus === "stale"
                        ? "text-kt-warning-text bg-kt-bg-surface-200"
                        : "text-kt-text-muted bg-kt-bg-surface-200"
                    }`}>
                      {VERIFICATION_LABEL[rec.verificationStatus]}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-kt-text-muted text-[9.5px]">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{rec.source}</span>
                    {rec.publishedAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{rec.publishedAt}</span>}
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{rec.sourceTier}</span>
                  </div>

                  {rec.quoteSpan && (
                    <div className="bg-kt-bg-surface-100 border-l-2 border-kt-border-panel/60 pl-2 mt-1 text-[10px] text-kt-text-secondary italic leading-relaxed">
                      &quot;{rec.quoteSpan.text}&quot;
                      {rec.quoteSpan.page && <span className="not-italic ml-1 text-kt-text-muted">p.{rec.quoteSpan.page}</span>}
                    </div>
                  )}

                  {rec.sourceUrl && (
                    <a
                      href={rec.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-1 text-[9.5px] text-kt-text-muted hover:text-kt-text-primary transition-colors mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      원본 열기
                    </a>
                  )}

                  <span className="font-mono text-[8.5px] text-kt-text-muted">{rec.evidenceId}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Unresolved evidence IDs (no record found) ── */}
        {unresolvedIds.length > 0 && (
          <div>
            <span className="text-[10px] text-kt-text-muted uppercase tracking-wider">미등록 증거 일련번호 (Unresolved)</span>
            <ul className="mt-1.5 flex flex-col gap-1 font-mono">
              {unresolvedIds.map((evId) => (
                <li key={evId} className="flex items-center justify-between bg-kt-bg-overlay-100 px-3 py-1.5 rounded border border-kt-border-panel/20 opacity-50">
                  <span className="text-kt-text-muted">{evId}</span>
                  <span className="text-[8.5px] text-kt-text-muted uppercase">미수집</span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[9.5px] text-kt-text-muted">
              이 ID는 현재 시스템에 근거 원문이 등록되지 않았습니다. 원문 수집 후 재확인하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
