"use client";

import React, { useState } from "react";
import type { DiagnosticDebateReport } from "@/domain/debate/diagnostic-debate";
import { MessageSquare, ShieldAlert, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/use-i18n";
import type { DataEnvelope } from "@/domain/common/data-status";

type Props = {
  initialReport: DiagnosticDebateReport;
};

export const DiagnosticDebatePanel: React.FC<Props> = ({ initialReport }) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  const [report, setReport] = useState<DiagnosticDebateReport>(initialReport);
  const [isOpen, setIsOpen] = useState(false);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "high":
        return "text-kt-positive-text font-bold";
      case "medium":
        return "text-kt-text-secondary";
      case "low":
      default:
        return "text-kt-text-muted";
    }
  };

  return (
    <div className="bg-kt-bg-surface-100/40 border border-kt-border-panel/40 rounded-kt-card px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-kt-text-muted" />
          <span className="text-xs font-bold text-kt-text-primary">
            {isKo ? "양방향 진단 대비표 (Diagnostic Debate)" : "Diagnostic Debate Sheet"}
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
                      ? "검증 규칙 위반 단어가 포함되어 전체 내용이 차단 처리되었습니다."
                      : "Diagnostic debate hidden due to wording policy violation."}
                  </div>
                  <div className="text-[9px] opacity-90 leading-normal">
                    {isKo
                      ? "이용자 보호 조치에 의거해 단정적인 투자 유도성 문구나 비정형 단정문은 표시될 수 없습니다."
                      : "Explicit recommendatory/order phrasing is hidden under current user-safety guidelines."}
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
              {/* balance summary */}
              <div className="bg-kt-bg-overlay-100 p-2.5 rounded border border-kt-border-panel/30 text-[10px] text-kt-text-secondary leading-relaxed font-sans">
                {report.balanceSummary}
              </div>

              {/* Side-by-Side: Bull and Bear Cases */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Bull Case */}
                {report.cases
                  .filter((c) => c.type === "bull_case")
                  .map((c) => (
                    <div
                      key={c.id}
                      className="bg-kt-bg-overlay-100 p-3 rounded border border-kt-border-panel/30 space-y-1.5"
                    >
                      <div className="flex justify-between items-center border-b border-kt-border-panel/10 pb-1">
                        <span className="font-bold text-kt-positive-text text-[9.5px] flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {c.title}
                        </span>
                        <span className={`text-[8px] ${getStrengthColor(c.strength)}`}>
                          Strength: {c.strength}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-kt-text-secondary leading-normal">{c.summary}</p>
                    </div>
                  ))}

                {/* Bear Case */}
                {report.cases
                  .filter((c) => c.type === "bear_case")
                  .map((c) => (
                    <div
                      key={c.id}
                      className="bg-kt-bg-overlay-100 p-3 rounded border border-kt-border-panel/30 space-y-1.5"
                    >
                      <div className="flex justify-between items-center border-b border-kt-border-panel/10 pb-1">
                        <span className="font-bold text-kt-negative-text text-[9.5px] flex items-center gap-1">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          {c.title}
                        </span>
                        <span className={`text-[8px] ${getStrengthColor(c.strength)}`}>
                          Strength: {c.strength}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-kt-text-secondary leading-normal">{c.summary}</p>
                    </div>
                  ))}
              </div>

              {/* Neutral & Gaps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Neutral Case */}
                {report.cases
                  .filter((c) => c.type === "neutral_risk")
                  .map((c) => (
                    <div
                      key={c.id}
                      className="bg-kt-bg-overlay-100 p-3 rounded border border-kt-border-panel/30 space-y-1.5"
                    >
                      <div className="font-bold text-kt-text-primary text-[9.5px] border-b border-kt-border-panel/10 pb-1">
                        {c.title}
                      </div>
                      <p className="text-[9.5px] text-kt-text-secondary leading-normal">{c.summary}</p>
                    </div>
                  ))}

                {/* Evidence Gap Case */}
                {report.cases
                  .filter((c) => c.type === "evidence_gap")
                  .map((c) => (
                    <div
                      key={c.id}
                      className="bg-kt-bg-overlay-100 p-3 rounded border border-kt-border-panel/30 space-y-1.5"
                    >
                      <div className="font-bold text-yellow-600 text-[9.5px] border-b border-kt-border-panel/10 pb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {c.title}
                      </div>
                      <p className="text-[9.5px] text-kt-text-secondary leading-normal">{c.summary}</p>
                    </div>
                  ))}
              </div>

              {/* Unresolved Questions */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-kt-text-muted block">
                  {isKo ? "추가 확인 필요 사항" : "Unresolved Questions"}
                </span>
                <ul className="list-disc list-inside text-kt-text-secondary text-[9.5px] space-y-0.5 pl-1 leading-normal">
                  {report.unresolvedQuestions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-[8px] font-mono border-t border-kt-border-panel/10 pt-2 text-kt-text-muted">
            <span>Created: {new Date(report.createdAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
