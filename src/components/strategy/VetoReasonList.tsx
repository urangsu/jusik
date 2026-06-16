import React from "react";
import { AlertTriangle } from "lucide-react";

interface VetoReasonListProps {
  reasons: string[];
  emptyLabel?: string;
}

export const VetoReasonList: React.FC<VetoReasonListProps> = ({
  reasons,
  emptyLabel = "차단 사유 없음",
}) => {
  if (reasons.length === 0) {
    return <span className="text-xs text-kt-text-muted">{emptyLabel}</span>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {reasons.map((reason) => (
        <li key={reason} className="flex items-start gap-2 text-xs text-kt-text-secondary">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-kt-negative-text" />
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  );
};
