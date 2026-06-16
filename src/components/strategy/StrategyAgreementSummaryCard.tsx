import React from "react";
import { Network } from "lucide-react";
import { StrategyAgreementSignal } from "@/domain/strategy/strategy-agreement-signal";
import { MetricCell } from "../ui/MetricCell";
import { Panel } from "../ui/Panel";
import { StatusBadge } from "../ui/StatusBadge";
import { StrategyAgreementBar } from "./StrategyAgreementBar";

const AGREEMENT_LABEL: Record<StrategyAgreementSignal["agreementLabel"], string> = {
  strong_watch: "검토 우선",
  watch: "관찰",
  neutral: "중립",
  caution: "주의",
  risk: "위험",
  insufficient_data: "전략 합의 불가",
};

export const StrategyAgreementSummaryCard: React.FC<{ signal: StrategyAgreementSignal }> = ({ signal }) => {
  return (
    <Panel
      title="전략 합의"
      headerAction={<Network className="h-4 w-4 text-kt-text-muted" />}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-kt-text-muted">합의 라벨</p>
            <p className="mt-1 text-xl font-semibold text-kt-text-primary">
              {AGREEMENT_LABEL[signal.agreementLabel]}
            </p>
          </div>
          <StatusBadge status={signal.status} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3">
            <p className="mb-2 text-xs text-kt-text-muted">합의 점수</p>
            <MetricCell value={signal.agreementScore} status={signal.status} />
          </div>
          <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3">
            <p className="mb-2 text-xs text-kt-text-muted">데이터 품질</p>
            <MetricCell
              value={signal.status === "insufficient_data" ? null : signal.dataQualityScore}
              status={signal.status}
              formatter={(value) => `${value}%`}
            />
          </div>
        </div>

        <StrategyAgreementBar agreementRate={signal.agreementRate} />

        <p className="rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3 text-xs leading-relaxed text-kt-text-muted">
          이 화면은 여러 전략 신호의 합의 정도를 보여주는 진단 도구이며, 매수·매도 지시가 아닙니다.
        </p>
        <p className="text-xs leading-relaxed text-kt-text-muted">{signal.explanation}</p>
      </div>
    </Panel>
  );
};
