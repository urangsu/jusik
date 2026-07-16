import React from "react";
import { AlertCircle, HelpCircle, ShieldCheck } from "lucide-react";
import { Panel } from "../ui/Panel";
import type { MethodRuleEvaluation } from "@/domain/research/method-evaluation";

interface MethodRulePanelProps {
  evaluations: MethodRuleEvaluation[];
}

export const MethodRulePanel: React.FC<MethodRulePanelProps> = ({ evaluations }) => {
  const getStatusBadge = (status: MethodRuleEvaluation["status"]) => {
    switch (status) {
      case "supported":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-positive-text bg-kt-positive-weak px-2 py-0.5 rounded border border-kt-positive/20">
            SUPPORTED
          </span>
        );
      case "contradicted":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-negative-text bg-kt-negative-weak px-2 py-0.5 rounded border border-kt-negative-text/20">
            CONTRADICTED
          </span>
        );
      case "insufficient_data":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-text-muted bg-kt-bg-overlay-200 px-2 py-0.5 rounded border border-kt-border-panel/30">
            INSUFFICIENT DATA
          </span>
        );
      case "not_applicable":
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-kt-text-muted bg-kt-bg-overlay-100 px-2 py-0.5 rounded border border-kt-border-panel/10">
            N/A
          </span>
        );
    }
  };

  return (
    <Panel title="방법론 검증 규칙 상태 (Method Rule Evaluations)">
      <div className="flex flex-col gap-3">
        <div className="bg-kt-bg-overlay-100 p-3 rounded-kt-card border border-kt-border-panel/30 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-kt-text-muted shrink-0 mt-0.5" />
          <div className="text-[11px] text-kt-text-muted leading-relaxed">
            <span className="font-bold text-kt-text-secondary">자료 정합성 점수 (Data Quality Score):</span>
            {" "}본 점수는 리서치 데이터와 분석 근거의 완전성 및 추적성(provenance)을 측정하는 지표이며,
            수익률 발생 확률이나 특정 주가의 상승 가능성을 나타내는 것이 절대 아닙니다.
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {evaluations.map((evalRecord) => {
            const hasMissing = evalRecord.missingInputs.length > 0;
            const qualityPct = evalRecord.dataQualityScore !== null 
              ? `${Math.round(evalRecord.dataQualityScore * 100)}%`
              : "—";

            return (
              <div
                key={evalRecord.ruleId}
                className="bg-kt-bg-surface-200/50 border border-kt-border-panel/40 rounded-kt-card p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-kt-text-primary text-xs tracking-wide">
                    {evalRecord.ruleId.toUpperCase().replace(/_/g, " ")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-kt-text-muted tabular-nums">
                      Quality: <strong className="text-kt-text-secondary">{qualityPct}</strong>
                    </span>
                    {getStatusBadge(evalRecord.status)}
                  </div>
                </div>

                {hasMissing && (
                  <div className="bg-kt-negative-weak/5 border border-kt-negative-text/10 p-2 rounded text-[10px] text-kt-negative-text flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-bold">누락된 입력 정보 (Missing Inputs):</span>
                    </div>
                    <ul className="list-disc pl-4 font-mono text-[9px] text-kt-text-muted">
                      {evalRecord.missingInputs.map((missing, idx) => (
                        <li key={idx}>{missing}</li>
                      ))}
                    </ul>
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
