import React from "react";
import { Activity } from "lucide-react";
import { FactorHealthBadge } from "@/domain/factors/factor-health";
import { Panel } from "../ui/Panel";
import { StatusBadge } from "../ui/StatusBadge";

const HEALTH_LABEL: Record<FactorHealthBadge, string> = {
  active: "활성",
  mixed: "혼재",
  suppressed: "억제",
  crowded: "혼잡",
  insufficient: "데이터 부족",
};

export const FactorEnvironmentPanel: React.FC<{
  health?: FactorHealthBadge;
  warnings?: string[];
}> = ({ health = "insufficient", warnings = ["IC/ICIR 검증 데이터 필요"] }) => {
  return (
    <Panel title="팩터 환경" headerAction={<Activity className="h-4 w-4 text-kt-text-muted" />}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-kt-text-muted">Factor Health</span>
          <StatusBadge status={health === "insufficient" ? "insufficient_data" : "cached"} />
        </div>
        <p className="text-sm font-semibold text-kt-text-primary">{HEALTH_LABEL[health]}</p>
        <div className="flex flex-col gap-2">
          {warnings.map((warning) => (
            <span key={warning} className="text-xs leading-relaxed text-kt-text-muted">
              {warning}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
};
