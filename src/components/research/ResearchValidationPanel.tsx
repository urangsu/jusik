import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Scale, Eye } from "lucide-react";
import { Panel } from "../ui/Panel";
import type { SynthesisResult } from "@/domain/research/synthesize-validation-reports";
import type { ResearchValidationReport } from "@/domain/research/research-validation";

interface ResearchValidationPanelProps {
  validationResult: SynthesisResult;
}

const SEAT_DISPLAY_NAMES: Record<ResearchValidationReport["seatId"], string> = {
  evidence_counter_thesis: "1. 증거품질 및 반박 가설 검증 (Evidence Quality & Counter-Thesis)",
  demand_supply_chain: "2. 수요 및 공급망 의존도 분석 (Demand & Supply-Chain Path)",
  company_attribution: "3. 상장사 실체 귀속성 확인 (Listed-Company Attribution)",
  financial_quality: "4. 재무 안전성 및 희석 위험 (Financial Viability & Dilution)",
  security_market_window: "5. 가격 매력도 및 기회 윈도우 (Security Pricing & Market Window)",
};

export const ResearchValidationPanel: React.FC<ResearchValidationPanelProps> = ({ validationResult }) => {
  const getStatusBadge = (status: ResearchValidationReport["status"], abstained: boolean) => {
    if (abstained) {
      return (
        <span className="text-[9px] font-bold text-kt-text-muted bg-kt-bg-overlay-200 px-2 py-0.5 rounded border border-kt-border-panel/30">
          ABSTAINED
        </span>
      );
    }

    switch (status) {
      case "confirming":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-positive-text bg-kt-positive-weak px-2 py-0.5 rounded border border-kt-positive/20">
            CONFIRMING
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
            DETERIORATING
          </span>
        );
      case "insufficient_data":
      default:
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-text-muted bg-kt-bg-overlay-100 px-2 py-0.5 rounded border border-kt-border-panel/10">
            INSUFFICIENT
          </span>
        );
    }
  };

  return (
    <Panel title="신뢰성 다면 검증 (Multi-Seat Reliability Validation)" headerAction={<Scale className="w-4 h-4 text-kt-text-muted" />}>
      <div className="flex flex-col gap-4 text-xs">
        {/* Global summary card showing veto outcomes */}
        <div className="bg-kt-bg-surface-200 border border-kt-border-panel/40 rounded-kt-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-kt-border-panel/40 pb-2">
            <span className="font-bold text-kt-text-muted text-[10px] tracking-wider">COMPOSITE VALIDATION DIAGNOSIS</span>
            {validationResult.isVetoed ? (
              <span className="flex items-center gap-1 text-[10px] font-bold text-kt-negative-text bg-kt-negative-weak px-2 py-0.5 rounded">
                <ShieldAlert className="w-3.5 h-3.5" /> VETO BLOCKED (검증 차단)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-bold text-kt-positive-text bg-kt-positive-weak px-2 py-0.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5" /> STABLE (검증 통과)
              </span>
            )}
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-kt-text-secondary">최종 합성 검증 상태 (Global Status)</span>
            <span className={`font-bold text-sm ${
              validationResult.globalStatus === "confirming"
                ? "text-kt-positive-text"
                : validationResult.globalStatus === "deteriorating"
                ? "text-kt-negative-text"
                : "text-kt-text-primary"
            }`}>
              {validationResult.globalStatus.toUpperCase()}
            </span>
          </div>

          {validationResult.vetoReasons.length > 0 && (
            <div className="bg-kt-negative-weak/10 border border-kt-negative-text/20 p-3 rounded text-[10px] text-kt-negative-text flex flex-col gap-1.5">
              <div className="flex items-start gap-1">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-bold">검증 차단 사유 (Veto Reasons):</span>
              </div>
              <ul className="list-disc pl-5 text-[9.5px] leading-relaxed flex flex-col gap-1 text-kt-text-secondary">
                {validationResult.vetoReasons.map((reason, idx) => (
                  <li key={idx} className="font-sans">{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Informative alert about validation constraints */}
        <div className="bg-kt-bg-overlay-100 p-3 rounded-kt-card border border-kt-border-panel/30 flex items-start gap-2.5">
          <Eye className="w-4 h-4 text-kt-text-muted shrink-0 mt-0.5" />
          <div className="text-[11px] text-kt-text-muted leading-relaxed">
            <span className="font-bold text-kt-text-secondary">신뢰도(Confidence) 안내:</span>
            {" "}신뢰도는 제공된 실증 증거의 수량과 정합성 수준을 나타내며, 미래 수익률 실현 확률이나 특정 매매 성공률과는 무관합니다.
          </div>
        </div>

        {/* List of ordered validation reports */}
        <div className="flex flex-col gap-3">
          {validationResult.reports.map((report) => {
            const displayName = SEAT_DISPLAY_NAMES[report.seatId] || report.seatId;

            return (
              <div
                key={report.seatId}
                className="bg-kt-bg-surface-200/50 border border-kt-border-panel/40 rounded-kt-card p-3 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-bold text-kt-text-primary text-[11px] leading-snug">
                    {displayName}
                  </span>
                  {getStatusBadge(report.status, report.abstained)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] font-mono border-t border-kt-border-panel/20 pt-2 text-kt-text-muted">
                  <div className="flex justify-between">
                    <span>Confidence (신뢰도)</span>
                    <span className="font-bold text-kt-text-secondary uppercase">{report.confidence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quality Score (품질)</span>
                    <span className="font-bold text-kt-text-secondary">{Math.round(report.dataQualityScore * 100)}%</span>
                  </div>
                </div>

                {report.vetoReasons.length > 0 && (
                  <div className="bg-kt-negative-weak/5 border border-kt-negative-text/10 p-2 rounded text-[10px] text-kt-negative-text">
                    {report.vetoReasons.join(". ")}
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
