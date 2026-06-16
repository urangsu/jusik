import React from "react";

interface SignalGaugeProps {
  value: number | null;
  label: string;
}

export const SignalGauge: React.FC<SignalGaugeProps> = ({ value, label }) => {
  const safeValue = value === null ? null : Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-kt-text-muted">{label}</span>
        <span className="font-semibold tabular-nums text-kt-text-primary">
          {safeValue === null ? "데이터 부족" : `${safeValue}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-kt-pill border border-kt-border-panel bg-kt-bg-overlay-300">
        <div
          className="h-full bg-kt-positive-text transition-[width]"
          style={{ width: `${safeValue ?? 0}%` }}
        />
      </div>
    </div>
  );
};
