import React from "react";
import { DataStatus } from "@/domain/common/data-status";
import { StatusBadge } from "./StatusBadge";

interface MetricCellProps {
  value: number | string | null;
  status: DataStatus;
  formatter?: (val: number | string) => string;
  className?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export const MetricCell: React.FC<MetricCellProps> = ({
  value,
  status,
  formatter,
  className = "",
  changeType = "neutral",
}) => {
  // Enforce the rule: if value is null, or if status indicates a clear lack of data, show status badge
  if (value === null || value === undefined || status === "api_required" || status === "error") {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <StatusBadge status={status} />
      </div>
    );
  }

  const formattedValue = formatter ? formatter(value) : String(value);

  let textColor = "text-kt-text-primary";
  if (changeType === "positive") {
    textColor = "text-kt-positive-text";
  } else if (changeType === "negative") {
    textColor = "text-kt-negative-text";
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`${textColor} font-medium tabular-nums`}>{formattedValue}</span>
      {status === "delayed" && <StatusBadge status="delayed" />}
    </div>
  );
};
