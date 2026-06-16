import React from "react";
import { ShieldAlert } from "lucide-react";
import { RiskDecomposition } from "@/domain/risk/risk-decomposition";
import { MetricCell } from "../ui/MetricCell";
import { Panel } from "../ui/Panel";

export const RiskDecompositionPanel: React.FC<{ decomposition: RiskDecomposition | null }> = ({
  decomposition,
}) => {
  const status = decomposition ? "cached" : "insufficient_data";

  return (
    <Panel title="리스크 분해" headerAction={<ShieldAlert className="h-4 w-4 text-kt-text-muted" />}>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3">
          <p className="mb-2 text-xs text-kt-text-muted">팩터 분산</p>
          <MetricCell value={decomposition?.factorVariance ?? null} status={status} />
        </div>
        <div className="rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3">
          <p className="mb-2 text-xs text-kt-text-muted">고유 분산</p>
          <MetricCell value={decomposition?.specificVariance ?? null} status={status} />
        </div>
        <div className="col-span-2 rounded-kt-card border border-kt-border-panel bg-kt-bg-overlay-300/30 p-3">
          <p className="mb-2 text-xs text-kt-text-muted">총 변동성</p>
          <MetricCell value={decomposition?.totalVolatility ?? null} status={status} />
        </div>
      </div>
    </Panel>
  );
};
