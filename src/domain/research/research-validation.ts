import type { SignalVersion } from "@/domain/signals/signal-version";

export type ResearchValidationSeatId =
  | "demand_supply_chain"
  | "company_attribution"
  | "financial_quality"
  | "security_market_window"
  | "evidence_counter_thesis";

export type ResearchValidationReport = {
  seatId: ResearchValidationSeatId;
  assetId: string;
  status: "confirming" | "mixed" | "deteriorating" | "insufficient_data";
  claimIds: string[];
  supportingEvidenceIds: string[];
  contradictingEvidenceIds: string[];
  missingInputs: string[];
  freshness: "fresh" | "stale" | "unknown";
  /** Confidence describes evidence sufficiency, not return probability. */
  confidence: "none" | "low" | "medium" | "high";
  abstained: boolean;
  vetoReasons: string[];
  dataQualityScore: number;
  signalVersion: SignalVersion;
};
