import React from "react";

export const StrategyAgreementBar: React.FC<{ agreementRate: number | null }> = ({ agreementRate }) => {
  const value = agreementRate === null ? null : Math.max(0, Math.min(100, agreementRate));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-kt-text-muted">합의율</span>
        <span className="font-semibold tabular-nums text-kt-text-primary">
          {value === null ? "데이터 부족" : `${value}%`}
        </span>
      </div>
      <div className="grid h-2 grid-cols-4 overflow-hidden rounded-kt-pill border border-kt-border-panel bg-kt-bg-overlay-300">
        <div className="col-span-4 h-full">
          <div className="h-full bg-kt-positive-text" style={{ width: `${value ?? 0}%` }} />
        </div>
      </div>
    </div>
  );
};
