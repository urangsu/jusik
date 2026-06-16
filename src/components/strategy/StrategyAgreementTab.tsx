import React from "react";
import { StrategyAgreementSignal } from "@/domain/strategy/strategy-agreement-signal";
import { StrategyViewScore } from "@/domain/strategy/strategy-view";
import { Panel } from "../ui/Panel";
import { StrategyAgreementSummaryCard } from "./StrategyAgreementSummaryCard";
import { StrategyScoreMatrix } from "./StrategyScoreMatrix";
import { VetoReasonList } from "./VetoReasonList";

interface StrategyAgreementTabProps {
  signal: StrategyAgreementSignal;
  views: StrategyViewScore[];
}

export const StrategyAgreementTab: React.FC<StrategyAgreementTabProps> = ({ signal, views }) => {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] gap-4 max-xl:grid-cols-1">
      <StrategyAgreementSummaryCard signal={signal} />
      <div className="flex min-h-0 flex-col gap-4">
        <Panel title="전략 매트릭스">
          <StrategyScoreMatrix views={views} />
        </Panel>
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          <Panel title="공통 상승 요인">
            <VetoReasonList reasons={signal.topBullishFactors} emptyLabel="계산 가능한 상승 요인 없음" />
          </Panel>
          <Panel title="공통 위험 요인">
            <VetoReasonList reasons={signal.topBearishFactors} emptyLabel="계산 가능한 위험 요인 없음" />
          </Panel>
          <Panel title="데이터 부족 항목">
            <VetoReasonList
              reasons={[
                ...signal.vetoReasons,
                ...signal.excludedViews.map((view) => `${view.strategyId}: ${view.reason}`),
              ]}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
};
