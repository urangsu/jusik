export type WatchlistReportSourceType =
  | "opendart_filing"
  | "alert_event"
  | "backtest_result"
  | "strategy_trial"
  | "signal_postmortem"
  | "provider_health"
  | "manual_link"
  | "manual_upload";

export type WatchlistReportSource = {
  sourceType: WatchlistReportSourceType;

  sourceId: string;
  sourceTitle: string;

  sourceUrl: string | null;
  internalUrl: string | null;

  sourceTier:
    | "official"
    | "free_limited"
    | "licensed_free"
    | "personal_fallback"
    | "manual_import";

  warnings: string[];

  publishedAt: string | null;
  capturedAt: string;
};
