import { NotificationChannelId } from "./alert-channel";
import { AlertCondition } from "./alert-condition";
import { AlertSeverity } from "./alert-severity";
import { AlertRuleType } from "./alert-rule-type";

export type { AlertRuleType };

export type AlertRuleScope =
  | "asset"
  | "watchlist"
  | "portfolio"
  | "universe"
  | "provider"
  | "market";

export type AlertRule = {
  id: string;
  name: string;
  enabled: boolean;

  locale: "ko" | "en";
  type: AlertRuleType;
  scope: AlertRuleScope;

  target: {
    universeId?: "KOSPI_SAMPLE" | "SP500_SAMPLE" | "KOSPI" | "SP500";
    assetIds?: string[];
    watchlistId?: string;
    portfolioId?: string;
    providerId?: string;
  };

  condition: AlertCondition;

  severity: AlertSeverity;
  channels: NotificationChannelId[];

  cooldownMinutes: number;
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };

  dataPolicy: {
    allowStale: boolean;
    allowDelayed: boolean;
    allowPersonalFallback: boolean;
    requireOfficialOrLicensed: boolean;
  };

  createdAt: string;
  updatedAt: string;
};
