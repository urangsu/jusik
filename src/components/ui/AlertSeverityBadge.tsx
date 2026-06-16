import React from "react";
import { AlertSeverity } from "@/domain/alerts/alert-severity";
import { useI18n } from "@/i18n/use-i18n";

interface AlertSeverityBadgeProps {
  severity: AlertSeverity;
}

export const AlertSeverityBadge: React.FC<AlertSeverityBadgeProps> = ({ severity }) => {
  const { t } = useI18n();

  let colorClasses = "";
  let label = "";

  switch (severity) {
    case "critical":
      colorClasses = "bg-kt-positive-weak text-kt-positive-text border-kt-positive/20";
      label = t("severityCritical") || "위험";
      break;
    case "warning":
      colorClasses = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      label = t("severityWarning") || "경고";
      break;
    case "watch":
      colorClasses = "bg-kt-negative-weak text-kt-negative-text border-kt-negative-weak";
      label = t("severityWatch") || "주의";
      break;
    case "info":
    default:
      colorClasses = "bg-kt-border-panel text-kt-text-secondary border-kt-border-panel";
      label = t("severityInfo") || "정보";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-kt-pill border ${colorClasses}`}
    >
      {label}
    </span>
  );
};
