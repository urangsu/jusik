export type MarketDataStatus =
  | "real_time"
  | "delayed"
  | "eod"
  | "cached"
  | "api_required"
  | "rate_limited"
  | "not_supported"
  | "not_found"
  | "insufficient_data"
  | "stale"
  | "error";
