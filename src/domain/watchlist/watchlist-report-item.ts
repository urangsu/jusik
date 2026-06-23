import { WatchlistReportSource } from "./watchlist-report-source";

export type WatchlistReportStatus =
  | "unread"
  | "read"
  | "archived"
  | "hidden";

export type WatchlistReportSeverity =
  | "info"
  | "watch"
  | "warning"
  | "critical";

export type WatchlistReportCategory =
  | "filing"
  | "internal_research"
  | "signal"
  | "backtest"
  | "provider"
  | "manual"
  | "data_quality";

export type WatchlistReportItem = {
  id: string;

  assetId: string;
  symbol: string;
  assetName: string | null;

  title: string;
  summary: string | null;

  category: WatchlistReportCategory;
  severity: WatchlistReportSeverity;

  source: WatchlistReportSource;

  status: WatchlistReportStatus;

  tags: string[];

  detectedAt: string;
  updatedAt: string;

  dedupeKey: string;
};
