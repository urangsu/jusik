"use client";

import React, { useState } from "react";
import type { FindingSynthesisReport } from "@/domain/report/report-section";
import { FileText, ShieldAlert, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";

type Props = {
  report: FindingSynthesisReport;
};

export const FindingSynthesisReportPanel: React.FC<Props> = ({ report }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel/40 rounded-kt-card px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-kt-text-muted" />
          <span className="text-xs font-bold text-kt-text-primary">
            {isKo ? "진단 요약 보고서 (Finding Synthesis)" : "Finding Synthesis Report"}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold uppercase border ${
              report.isBlocked
                ? "bg-kt-negative-weak/10 text-kt-negative-text border-kt-negative-text/20"
                : "bg-kt-positive/10 text-kt-positive-text border-kt-positive/20"
            }`}
          >
            {report.isBlocked ? (isKo ? "차단됨" : "Blocked") : (isKo ? "정상" : "Safe")}
          </span>
        </div>
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="text-[10px] font-semibold text-kt-text-secondary hover:text-kt-text-primary select-none cursor-pointer"
        >
          {isOpen ? (isKo ? "간략히" : "Collapse") : (isKo ? "자세히" : "Expand")}
        </button>
      </div>

      <div className="text-[10px] text-kt-text-secondary font-medium">
        {report.subjectId} ({report.subjectType})
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-kt-border-panel/30 space-y-4">
          {report.isBlocked ? (
            <div className="space-y-2">
              <div className="p-2.5 bg-kt-negative-weak/15 border border-kt-negative-text/30 rounded text-[9.5px] text-kt-negative-text flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <div className="font-bold">
                    {isKo
                      ? "정책 위반 단어 감지로 보고서 상세가 차단되었습니다."
                      : "Wording policy violation. Report details hidden."}
                  </div>
                  <div className="text-[9px] opacity-90 leading-normal">
                    {isKo
                      ? "투자 유도형 문구나 비정형 단정문이 감지되어 차단 처리되었습니다."
                      : "Direct buy/sell recommendation wording has been flagged and blocked."}
                  </div>
                </div>
              </div>
              <div className="bg-kt-bg-overlay-100 p-2 rounded border border-kt-border-panel/30">
                <span className="text-[9px] font-bold uppercase tracking-wider text-kt-text-muted block mb-1">
                  {isKo ? "차단 사유" : "Block Reasons"}
                </span>
                <ul className="list-disc list-inside text-kt-negative-text/90 text-[9px] space-y-0.5">
                  {report.blockReasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-kt-bg-overlay-100 p-2.5 rounded border border-kt-border-panel/30 text-[10px] text-kt-text-secondary leading-relaxed font-sans">
                {report.synthesisSummary}
              </div>

              {/* Logical Sections */}
              <div className="space-y-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-kt-text-muted block">
                  {isKo ? "세부 진단 섹션" : "Diagnostic Sections"}
                </span>
                <div className="space-y-2">
                  {report.sections.map((sec) => (
                    <div
                      key={sec.id}
                      className="bg-kt-bg-overlay-100 p-3 rounded border border-kt-border-panel/30 space-y-1.5"
                    >
                      <div className="flex justify-between items-center border-b border-kt-border-panel/10 pb-1">
                        <span className="font-bold text-kt-text-primary text-[9.5px]">{sec.title}</span>
                        <span className="text-[8px] text-kt-text-muted">Confidence: {sec.confidence}</span>
                      </div>
                      <p className="text-[9.5px] text-kt-text-secondary leading-normal">{sec.summary}</p>
                      {sec.limitations.length > 0 && (
                        <div className="text-[8px] text-kt-text-muted leading-normal">
                          <strong>Limitations:</strong> {sec.limitations.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Risks & Gaps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[9px]">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-kt-text-muted block">
                    {isKo ? "핵심 리스크 요인" : "Key Risks"}
                  </span>
                  {report.keyRisks.length > 0 ? (
                    <ul className="list-disc list-inside text-kt-text-secondary space-y-0.5">
                      {report.keyRisks.map((risk, idx) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-kt-text-muted italic">{isKo ? "검출된 리스크 없음" : "No risks defined"}</div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-kt-text-muted block">
                    {isKo ? "증거 자료 누락" : "Evidence Gaps"}
                  </span>
                  {report.evidenceGaps.length > 0 ? (
                    <ul className="list-disc list-inside text-yellow-600 space-y-0.5">
                      {report.evidenceGaps.map((gap, idx) => (
                        <li key={idx}>{gap}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-kt-positive-text font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-kt-positive-text" />
                      <span>{isKo ? "누락 없음" : "Complete data trail"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-[8px] font-mono border-t border-kt-border-panel/10 pt-2 text-kt-text-muted">
            <span>Engine: {report.engineVersion}</span>
            <span>Created: {new Date(report.createdAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
