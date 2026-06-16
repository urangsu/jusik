import { DataStatus } from "@/domain/common/data-status";
import { AlertRuleType } from "./alert-rule";
import { AlertSeverity } from "./alert-severity";

export type AlertEvent = {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleType: AlertRuleType;
  severity: AlertSeverity;
  assetId?: string;
  symbol?: string;
  title: string;
  body: string;
  data?: unknown;
  dataStatus: DataStatus;
  source: string;
  sourceTier: string;
  warnings: string[];
  createdAt: string;
};
