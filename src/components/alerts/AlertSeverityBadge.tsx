import React from "react";
import { AlertSeverity } from "../../domain/alerts/alert-severity";
import { useI18n } from "../../i18n/use-i18n";

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
  className?: string;
}

export const AlertSeverityBadge: React.FC<AlertSeverityBadgeProps> = ({
  severity,
  className = "",
}) => {
  const { locale } = useI18n();
  const isKo = locale === "ko";

  let colorClasses = "bg-kt-bg-surface-100 text-kt-text-muted border-kt-border-panel/40";
  let label: string = severity;

  if (severity === "info") {
    colorClasses = "bg-kt-bg-surface-100 text-kt-text-muted border-kt-border-panel/40";
    label = isKo ? "정보" : "Info";
  } else if (severity === "watch") {
    colorClasses = "bg-kt-bg-overlay-300 text-kt-text-secondary border-kt-border-panel";
    label = isKo ? "관찰" : "Watch";
  } else if (severity === "warning") {
    colorClasses = "bg-amber-500/10 text-amber-400 border-amber-500/20";
    label = isKo ? "주의" : "Warning";
  } else if (severity === "critical") {
    colorClasses = "bg-kt-positive-weak text-kt-positive-text border-kt-positive/20"; // Red-like in KR convention
    label = isKo ? "위험" : "Critical";
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-kt-pill text-[10px] font-bold border leading-none tracking-tight ${colorClasses} ${className}`}
    >
      {label}
    </span>
  );
};
