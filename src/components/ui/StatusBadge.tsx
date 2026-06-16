import React from "react";
import { DataStatus } from "@/domain/common/data-status";

export const STATUS_LABEL: Record<DataStatus, string> = {
  real_time: "실시간",
  delayed: "지연",
  eod: "종가",
  cached: "캐시",
  api_required: "API 필요",
  rate_limited: "호출 제한",
  not_supported: "미지원",
  not_found: "없음",
  error: "오류",
  insufficient_data: "데이터 부족",
  stale: "오래된 데이터",
};

interface StatusBadgeProps {
  status: DataStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const label = STATUS_LABEL[status] || status;

  let colorClasses = "bg-kt-bg-overlay-300 text-kt-text-secondary border-kt-border-panel";

  if (status === "real_time") {
    colorClasses = "bg-kt-positive-weak text-kt-positive-text border-kt-positive/20";
  } else if (status === "delayed") {
    colorClasses = "bg-amber-500/10 text-amber-500 border-amber-500/20";
  } else if (status === "api_required") {
    colorClasses = "bg-kt-negative-weak text-kt-negative-text border-kt-negative-text/20";
  } else if (status === "error" || status === "rate_limited") {
    colorClasses = "bg-red-500/10 text-red-500 border-red-500/20";
  } else if (status === "not_supported" || status === "not_found" || status === "insufficient_data" || status === "stale") {
    colorClasses = "bg-kt-bg-surface-100 text-kt-text-muted border-kt-border-panel";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-kt-pill text-xs font-medium border ${colorClasses} ${className}`}
    >
      {label}
    </span>
  );
};
