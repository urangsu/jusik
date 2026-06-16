import { SourceUsagePolicy, SourceWarning } from "../source/provider-tier";

export type DataStatus =
  | "real_time"
  | "delayed"
  | "eod"
  | "cached"
  | "stale"
  | "api_required"
  | "rate_limited"
  | "not_supported"
  | "not_found"
  | "error"
  | "insufficient_data";

export type MarketRegion = "US" | "KR";

export type DataEnvelope<T> = {
  value: T | null;
  status: DataStatus;
  source: string;
  sourceTier: SourceUsagePolicy;
  warnings: SourceWarning[];
  updatedAt: string | null;
  delayMinutes?: number;
  errorCode?: string;
  message?: string;
};
