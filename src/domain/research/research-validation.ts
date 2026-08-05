import type { SignalVersion } from "@/domain/signals/signal-version";
import type { ResearchVetoSeverity } from "@/domain/research/method-rule";

export type ResearchValidationSeatId =
  | "demand_supply_chain"
  | "company_attribution"
  | "financial_quality"
  | "security_market_window"
  | "evidence_counter_thesis";

/**
 * A machine-readable veto reason.
 * Required when isVetoed=true in SynthesisResult.
 * severity must be "blocking" or "fatal" to produce isVetoed=true.
 */
export type ResearchVetoReason = {
  /** Stable, machine-readable veto code. */
  code: string;
  severity: Extract<ResearchVetoSeverity, "blocking" | "fatal">;
  seatId: ResearchValidationSeatId;
  /** Rule that triggered this veto, or null if seat-level (e.g. availability). */
  ruleId: string | null;
  /** Human-readable explanation for display. Never empty when present. */
  message: string;
  /** IDs of contradicting evidence records that triggered this veto. */
  evidenceIds: string[];
};

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
  vetoReasons: ResearchVetoReason[];
  dataQualityScore: number;
  signalVersion: SignalVersion | null;
};
