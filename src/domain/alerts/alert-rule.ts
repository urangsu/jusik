import { NotificationChannelId } from "./alert-channel";
import { AlertCondition } from "./alert-condition";
import { AlertSeverity } from "./alert-severity";

export type AlertRuleType =
  | "price_cross"
  | "return_zscore"
  | "volume_zscore"
  | "gap_move"
  | "intraday_reversal"
  | "new_filing"
  | "provider_error"
  | "data_quality"
  | "strategy_score_change"
  | "portfolio_risk";

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
