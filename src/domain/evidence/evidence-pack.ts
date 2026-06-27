export type EvidenceSourceType =
  | "data_envelope"
  | "market_quote"
  | "ohlcv"
  | "opendart_filing"
  | "audit_finding"
  | "watchlist_report"
  | "strategy_trial"
  | "signal_postmortem"
  | "provider_health"
  | "manual_import";

export type EvidenceClaimType =
  | "price"
  | "volume"
  | "filing"
  | "factor"
  | "signal"
  | "risk"
  | "correlation"
  | "market_exposure"
  | "news"
  | "unknown";

export type EvidenceRef = {
  id: string;
  sourceType: EvidenceSourceType;
  sourceId: string;
  source: string;
  sourceTier: string;
  status: string;
  updatedAt: string | null;
  warnings: string[];
};

export type EvidencePack = {
  id: string;
  subjectType: "asset" | "strategy" | "watchlist" | "audit" | "market" | "report";
  subjectId: string;

  evidenceRefs: EvidenceRef[];

  asOf: string;
  freshness: "fresh" | "stale" | "mixed" | "unknown";

  claimTypes: EvidenceClaimType[];
  missingEvidence: string[];

  blockedActions: string[];
  limitations: string[];

  createdAt: string;
  engineVersion: string;
};
