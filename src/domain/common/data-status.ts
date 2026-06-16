export type DataStatus =
  | "real_time"
  | "delayed"
  | "eod"
  | "cached"
  | "api_required"
  | "rate_limited"
  | "not_supported"
  | "not_found"
  | "error"
  | "insufficient_data"
  | "stale";

export type MarketRegion = "US" | "KR";

export type DataEnvelope<T> = {
  value: T | null;
  status: DataStatus;
  source: string;
  updatedAt: string | null;
  delayMinutes?: number;
  errorCode?: string;
  message?: string;
};
