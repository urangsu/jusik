export type ReliabilityWarning =
  | "insufficient_sample"
  | "low_ic"
  | "negative_ic"
  | "unstable_ic"
  | "low_hit_rate"
  | "personal_fallback_used"
  | "sample_universe_only"
  | "not_for_investment_decision"
  | "missing_adjusted_price"
  | "no_historical_universe_membership";
