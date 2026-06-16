import React from "react";
import { BarChart3 } from "lucide-react";
import { StdDevSignal } from "@/domain/strategy/stddev-signal";
import { MetricCell } from "../ui/MetricCell";
import { Panel } from "../ui/Panel";

const formatPrice = (value: number | string) =>
  typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value;

const formatZScore = (value: number | string) =>
  typeof value === "number" ? value.toFixed(2) : value;

type BandRow = {
  label: string;
  value: number | null;
};

export const StdDevBandPanel: React.FC<{ signal: StdDevSignal }> = ({ signal }) => {
  const rows: BandRow[] = [
    { label: "현재가", value: signal.lastPrice },
    { label: "이동평균", value: signal.movingAverage },
    { label: "+1σ", value: signal.upper1 },
    { label: "+2σ", value: signal.upper2 },
    { label: "+3σ", value: signal.upper3 },
    { label: "-1σ", value: signal.lower1 },
    { label: "-2σ", value: signal.lower2 },
    { label: "-3σ", value: signal.lower3 },
  ];

  return (
    <Panel
      title="표준편차 밴드"
      headerAction={<BarChart3 className="h-4 w-4 text-kt-text-muted" />}
    >
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 px-3 py-2"
          >
            <span className="text-xs text-kt-text-secondary">{row.label}</span>
            <MetricCell value={row.value} status={signal.status} formatter={formatPrice} />
          </div>
        ))}
        <div className="mt-2 flex items-center justify-between rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/50 px-3 py-2">
          <span className="text-xs font-semibold text-kt-text-primary">z-score</span>
          <MetricCell value={signal.zScore} status={signal.status} formatter={formatZScore} />
        </div>
      </div>
    </Panel>
  );
};
