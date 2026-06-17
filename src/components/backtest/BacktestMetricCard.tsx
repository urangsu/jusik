"use client";

import React from "react";
import { DataStatus } from "@/domain/common/data-status";
import { MetricCell } from "../ui/MetricCell";

interface BacktestMetricCardProps {
  label: string;
  value: number | null;
  status: DataStatus;
  formatter: (val: number) => string;
  description?: string;
  changeType?: "positive" | "negative" | "neutral";
  hasVeto?: boolean;
}

export const BacktestMetricCard: React.FC<BacktestMetricCardProps> = ({
  label,
  value,
  status,
  formatter,
  description,
  changeType = "neutral",
  hasVeto = false,
}) => {
  // If there's a veto, we force status to "insufficient_data" and value to null so numbers are not shown.
  const displayValue = hasVeto ? null : value;
  const displayStatus = hasVeto ? "insufficient_data" : status;

  return (
    <div className="bg-kt-bg-surface-100 border border-kt-border-panel rounded-kt-card p-4 flex flex-col justify-between gap-1.5 h-full">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-kt-text-secondary font-medium">{label}</span>
        {description && (
          <span className="text-[10px] text-kt-text-muted leading-tight">{description}</span>
        )}
      </div>
      <div className="mt-2">
        <MetricCell
          value={displayValue}
          status={displayStatus}
          formatter={(val) => formatter(Number(val))}
          changeType={changeType}
          className="text-lg font-bold tabular-nums"
        />
      </div>
    </div>
  );
};
