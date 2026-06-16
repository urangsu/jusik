import React from "react";
import { Activity, ShieldAlert } from "lucide-react";
import { StdDevSignal } from "@/domain/strategy/stddev-signal";
import { Panel } from "../ui/Panel";
import { StatusBadge } from "../ui/StatusBadge";
import { SignalGauge } from "./SignalGauge";
import { VetoReasonList } from "./VetoReasonList";

const POSITION_LABEL: Record<StdDevSignal["position"], string> = {
  deep_oversold: "통계적 과매도 관찰",
  oversold: "과매도권 관찰",
  neutral: "중립",
  overbought: "과열 주의",
  deep_overbought: "과열 위험",
  insufficient_data: "데이터 부족",
};

const DIRECTION_LABEL: Record<StdDevSignal["direction"], string> = {
  mean_reversion_watch: "평균 회귀 관찰",
  overextension_risk: "확장 위험",
  neutral: "중립",
  insufficient_data: "계산 불가",
};

export const StdDevSignalCard: React.FC<{ signal: StdDevSignal }> = ({ signal }) => {
  return (
    <Panel
      title="신호 진단"
      headerAction={<Activity className="h-4 w-4 text-kt-text-muted" />}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-kt-text-muted">통계적 위치</p>
            <p className="mt-1 text-lg font-semibold text-kt-text-primary">
              {POSITION_LABEL[signal.position]}
            </p>
          </div>
          <StatusBadge status={signal.status} />
        </div>

        <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-kt-text-primary">
            <ShieldAlert className="h-4 w-4 text-kt-text-muted" />
            {DIRECTION_LABEL[signal.direction]}
          </div>
          <p className="text-xs leading-relaxed text-kt-text-muted">{signal.explanation}</p>
        </div>

        <SignalGauge value={signal.signalStrength} label="신호 강도" />
        <SignalGauge
          value={signal.status === "insufficient_data" ? null : signal.dataQualityScore}
          label="데이터 품질"
        />

        <div className="mt-auto">
          <p className="mb-2 text-xs font-semibold text-kt-text-primary">Veto reasons</p>
          <VetoReasonList reasons={signal.vetoReasons} />
        </div>
      </div>
    </Panel>
  );
};
