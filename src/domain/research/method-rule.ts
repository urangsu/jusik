/**
 * Transferable research method rules.
 *
 * These rules are:
 * - Named and deterministic
 * - Unweighted (no numeric scores for ranking)
 * - Research-only (not trading signals)
 * - Not specific to any named investor persona
 * - All productionEligible: false until independent out-of-sample validation
 */

import type { SignalVersion } from "@/domain/signals/signal-version";

/**
 * Veto severity for a research method rule violation.
 * - none: violation has no effect on veto status
 * - warning: produces deteriorating but NOT isVetoed=true
 * - blocking: produces isVetoed=true
 * - fatal: produces isVetoed=true and globalStatus=deteriorating
 */
export type ResearchVetoSeverity = "none" | "warning" | "blocking" | "fatal";

export type ResearchMethodRuleId =
  | "demand_evidence"
  | "supply_chain_bottleneck"
  | "substitutability"
  | "qualification_cycle"
  | "capacity_elasticity"
  | "customer_validation"
  | "contract_counterparty_quality"
  | "gaap_financial_quality"
  | "dilution_financing_risk"
  | "valuation_absorption"
  | "market_window";

export type ResearchMethodRule = {
  ruleId: ResearchMethodRuleId;
  displayName: string;
  description: string;
  /** Keys that must be present in the research claims before evaluation */
  requiredInputKeys: string[];
  /** Evidence kind tags required (e.g. "revenue_data", "filing_10k") */
  requiredEvidenceKinds: string[];
  /** Human-readable conditions that move status toward "supported" */
  confirmConditions: string[];
  /** Human-readable conditions that move status toward "mixed" */
  warningConditions: string[];
  /** Human-readable conditions that produce "contradicted" */
  breakConditions: string[];
  supportedMarkets: Array<"KR" | "US">;
  /**
   * Severity of violation if this rule's break conditions are triggered.
   * warning → deteriorating only, never isVetoed=true
   * blocking/fatal → isVetoed=true
   */
  vetoSeverity: ResearchVetoSeverity;
  /**
   * Always false. Production eligibility requires K-Terminal's own
   * out-of-sample validation, which is not yet complete.
   */
  productionEligible: false;
  engineVersion: string;
};
