export type AiOutputIntent =
  | "market_summary"
  | "audit_finding_explanation"
  | "strategy_trial_explanation"
  | "signal_reliability_explanation"
  | "filing_explanation"
  | "provider_status_explanation";

export type AiClaimRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "blocked";

export type AiGroundedClaim = {
  id: string;
  text: string;

  sourceType:
    | "data_envelope"
    | "audit_finding"
    | "watchlist_report"
    | "strategy_trial"
    | "backtest_result"
    | "filing"
    | "provider_health";

  sourceId: string;
  source: string;
  status:
    | "real_time"
    | "delayed"
    | "eod"
    | "cached"
    | "stale"
    | "api_required"
    | "rate_limited"
    | "not_supported"
    | "not_found"
    | "error";

  updatedAt: string | null;
  warnings: string[];

  riskLevel: AiClaimRiskLevel;
};

export type StructuredAiOutput = {
  id: string;
  intent: AiOutputIntent;

  title: string;
  summary: string;

  claims: AiGroundedClaim[];

  limitations: string[];
  requiredDisclaimers: string[];

  blockedTerms: string[];
  isBlocked: boolean;
  blockReasons: string[];

  generatedAt: string;
  engineVersion: string;
};
