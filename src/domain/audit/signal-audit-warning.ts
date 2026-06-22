export type SignalAuditWarning =
  | "insufficient_sample"
  | "negative_contribution"
  | "weak_signal_high_weight"
  | "unstable_signal"
  | "missing_forward_return"
  | "missing_signal_score"
  | "sample_universe_only"
  | "personal_fallback_used"
  | "price_data_missing"
  | "not_enough_cross_section"
  | "not_enough_time_series";
