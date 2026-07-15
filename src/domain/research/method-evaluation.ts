/**
 * Deterministic evaluation output for a single method rule against a set of claims.
 *
 * dataQualityScore measures completeness/provenance only.
 * It is NOT an upside probability and must NOT be presented as one.
 */

import type { ResearchMethodRuleId } from "./method-rule";
import type { SignalVersion } from "@/domain/signals/signal-version";

export type MethodEvaluationStatus =
  | "supported"
  | "contradicted"
  | "insufficient_data"
  | "not_applicable";

export type MethodRuleEvaluation = {
  ruleId: ResearchMethodRuleId;
  assetId: string;
  status: MethodEvaluationStatus;
  /** IDs of claims that were evaluated */
  claimIds: string[];
  /** IDs of evidence supporting the rule */
  supportingEvidenceIds: string[];
  /** IDs of evidence contradicting the rule */
  contradictingEvidenceIds: string[];
  /** Required input keys that are missing */
  missingInputs: string[];
  /** Evidence IDs that are past their evidenceSpan */
  staleEvidenceIds: string[];
  /** Reasons that vetoed a more positive status */
  vetoReasons: string[];
  /**
   * Data quality score (0–1): measures evidence completeness and provenance.
   * Must NOT be interpreted as probability of upside or return.
   */
  dataQualityScore: number;
  signalVersion: SignalVersion;
};
