export type AuditFindingScope =
  | "asset"
  | "universe"
  | "strategy"
  | "trial"
  | "signal"
  | "factor_pair";

export type AuditFindingSourceType =
  | "individual_signal_ic"
  | "factor_correlation"
  | "market_exposure"
  | "signal_postmortem"
  | "strategy_trial";

export type AuditFindingSeverity =
  | "info"
  | "watch"
  | "warning"
  | "critical";

export type AuditFindingActionability =
  | "review_only"
  | "manual_research_required"
  | "data_quality_check_required"
  | "not_actionable";

export type AuditFinding = {
  id: string;

  sourceType: AuditFindingSourceType;
  sourceId: string;

  scope: AuditFindingScope;

  assetId: string | null;
  symbol: string | null;
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE" | null;
  strategyId: string | null;
  trialId: string | null;
  signalId: string | null;
  factorA: string | null;
  factorB: string | null;

  title: string;
  summary: string;

  severity: AuditFindingSeverity;
  actionability: AuditFindingActionability;

  warnings: string[];

  sourceTier:
    | "official"
    | "free_limited"
    | "licensed_free"
    | "personal_fallback"
    | "manual_import"
    | "mixed"
    | "unknown";

  sourceUrl: string | null;
  internalUrl: string | null;

  detectedAt: string;
  calculatedAt: string;
  engineVersion: string;
};
