import { DataStatus } from "@/domain/common/data-status";
import { SourceUsagePolicy, SourceWarning } from "@/domain/source/provider-tier";
import { ProviderId } from "@/domain/settings/provider-id";
import { AlertRuleType } from "./alert-rule-type";
import { AlertSeverity } from "./alert-severity";

export type AlertEvent = {
  id: string;

  ruleType: AlertRuleType;
  ruleId?: string | null;
  ruleName?: string | null;
  severity: AlertSeverity;

  titleKo: string;
  titleEn: string;

  messageKo: string;
  messageEn: string;

  assetId?: string | null;
  symbol?: string | null;
  universeId?: "KOSPI_SAMPLE" | "SP500_SAMPLE" | null;

  providerId?: ProviderId | null;

  sourceEventId?: string | null;
  sourceReceiptNo?: string | null;

  dataStatus: DataStatus;
  source: string;
  sourceTier: SourceUsagePolicy;
  warnings: SourceWarning[];

  dedupeKey: string;
  occurredAt: string;
  createdAt: string;

  readAt: string | null;
  dismissedAt: string | null;
  data?: any;
};
