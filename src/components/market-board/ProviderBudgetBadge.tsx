import React from "react";

interface ProviderBudgetBadgeProps {
  used: number;
  limit: number | null;
}

export const ProviderBudgetBadge: React.FC<ProviderBudgetBadgeProps> = ({ used, limit }) => {
  if (limit === null) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-kt-pill bg-kt-bg-body text-kt-text-muted border border-kt-border-panel">
        무제한
      </span>
    );
  }

  const ratio = used / limit;
  let colorClasses = "bg-kt-negative-weak text-kt-negative-text border-kt-negative-text/20"; // Safe (blue)

  if (ratio >= 0.8) {
    colorClasses = "bg-kt-positive-weak text-kt-positive-text border-kt-positive/20"; // Warning/Critical (red)
  }

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-kt-pill border font-medium tabular-nums ${colorClasses}`}>
      {used} / {limit}
    </span>
  );
};
