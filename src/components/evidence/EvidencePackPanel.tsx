"use client";

import React, { useState } from "react";
import type { EvidencePack, EvidenceRef } from "@/domain/evidence/evidence-pack";
import { FileText, ShieldAlert, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";

type Props = {
  evidencePack: EvidencePack;
};

export const EvidencePackPanel: React.FC<Props> = ({ evidencePack }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";
  const [isOpen, setIsOpen] = useState(false);

  const getFreshnessColor = (freshness: EvidencePack["freshness"]) => {
    switch (freshness) {
      case "fresh":
        return "bg-kt-positive/10 text-kt-positive-text border-kt-positive/20";
      case "stale":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "mixed":
        return "bg-kt-bg-overlay-300 text-kt-text-secondary border-kt-border-panel/40";
      default:
        return "bg-kt-bg-overlay-200 text-kt-text-muted border-kt-border-panel/30";
    }
  };

  return (
    <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel/40 rounded-kt-card px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-kt-text-muted" />
          <span className="text-xs font-bold text-kt-text-primary">
            {isKo ? "증거 팩 정보 (Evidence Pack)" : "Evidence Pack Ledger"}
          </span>
          <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold border uppercase ${getFreshnessColor(evidencePack.freshness)}`}>
            {evidencePack.freshness}
          </span>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-[10px] font-semibold text-kt-text-secondary hover:text-kt-text-primary select-none cursor-pointer"
        >
          {isOpen ? (isKo ? "간략히" : "Collapse") : (isKo ? "자세히" : "Expand")}
        </button>
      </div>

      <div className="flex flex-wrap gap-4 text-[9px] text-kt-text-muted font-mono">
        <div>
          <strong className="text-kt-text-secondary">Subject Type:</strong> {evidencePack.subjectType}
        </div>
        <div>
          <strong className="text-kt-text-secondary">Subject ID:</strong> {evidencePack.subjectId}
        </div>
        <div>
          <strong className="text-kt-text-secondary">As of:</strong> {new Date(evidencePack.asOf).toLocaleString()}
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-kt-border-panel/30 space-y-4">
          {/* Evidence References */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-kt-text-muted">
              {isKo ? "연계 증거 목록" : "Evidence References"}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {evidencePack.evidenceRefs.map((ref) => (
                <div
                  key={ref.id}
                  className="bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30 text-[9px] space-y-1 font-mono"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold text-kt-text-primary truncate max-w-[150px]">{ref.source}</span>
                    <span className="text-kt-text-muted text-[8px]">{ref.sourceType}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-[8px] text-kt-text-secondary">
                    <div>Tier: {ref.sourceTier}</div>
                    <div>Status: {ref.status}</div>
                  </div>
                  {ref.updatedAt && (
                    <div className="text-[8px] text-kt-text-muted">
                      Updated: {new Date(ref.updatedAt).toLocaleString()}
                    </div>
                  )}
                  {ref.warnings.length > 0 && (
                    <div className="text-[8px] text-kt-negative-text font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                      <span>{ref.warnings.join(", ")}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Missing Evidence & Limitations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[9px]">
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-kt-text-muted">
                {isKo ? "누락된 정보" : "Missing Evidence"}
              </span>
              {evidencePack.missingEvidence.length > 0 ? (
                <ul className="list-disc list-inside text-yellow-600 space-y-0.5">
                  {evidencePack.missingEvidence.map((me) => (
                    <li key={me}>{me}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-kt-positive-text font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-kt-positive-text" />
                  <span>{isKo ? "누락 항목 없음" : "All evidence present"}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-kt-text-muted">
                {isKo ? "분석 제한 조건" : "Limitations"}
              </span>
              <ul className="list-disc list-inside text-kt-text-secondary space-y-0.5">
                {evidencePack.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Blocked Actions / Warnings */}
          <div className="flex flex-wrap gap-2 text-[8px] font-mono border-t border-kt-border-panel/10 pt-2 text-kt-text-muted">
            <span>Engine: {evidencePack.engineVersion}</span>
            <span>Created: {new Date(evidencePack.createdAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
