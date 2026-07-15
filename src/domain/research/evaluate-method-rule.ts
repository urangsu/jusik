/**
 * Pure, deterministic method rule evaluator.
 *
 * Rules:
 * - Missing required inputs → "insufficient_data"
 * - Fatal contradicting evidence → "contradicted"
 * - Expired evidence is stale and cannot support the rule
 * - Unsupported market → "not_applicable"
 * - No evidence → insufficient_data (no synthetic claim created)
 * - dataQualityScore = (provided inputs / total required inputs), capped to [0, 1]
 */

import type { ResearchMethodRule } from "./method-rule";
import type { ResearchClaim } from "./research-claim";
import type { MethodRuleEvaluation } from "./method-evaluation";
import type { SignalVersion } from "@/domain/signals/signal-version";

export type EvaluateMethodRuleInput = {
  rule: ResearchMethodRule;
  assetId: string;
  market: "KR" | "US";
  claims: ResearchClaim[];
  /** Map from evidenceId → { kind: string; expiryAt: string | null } */
  evidenceMeta: Record<string, { kind: string; expiryAt: string | null }>;
  /** ISO-8601 date for staleness evaluation */
  asOfDate: string;
  signalVersion: SignalVersion;
};

export function evaluateMethodRule(input: EvaluateMethodRuleInput): MethodRuleEvaluation {
  const { rule, assetId, market, claims, evidenceMeta, asOfDate, signalVersion } = input;

  const base: Omit<MethodRuleEvaluation, "status" | "dataQualityScore"> = {
    ruleId: rule.ruleId,
    assetId,
    claimIds: [],
    supportingEvidenceIds: [],
    contradictingEvidenceIds: [],
    missingInputs: [],
    staleEvidenceIds: [],
    vetoReasons: [],
    signalVersion,
  };

  // Gate 1: Market support check
  if (!rule.supportedMarkets.includes(market)) {
    return { ...base, status: "not_applicable", dataQualityScore: 0 };
  }

  // Gate 2: Required input keys check
  // Input keys are derived from claim kinds that match the rule's requirements
  const presentInputKeys = new Set<string>();
  for (const claim of claims) {
    if (claim.assetId === assetId && claim.claimKind !== "other") {
      presentInputKeys.add(claim.claimKind);
    }
  }

  const missingInputs: string[] = [];
  for (const key of rule.requiredInputKeys) {
    if (!presentInputKeys.has(key)) {
      missingInputs.push(key);
    }
  }

  if (missingInputs.length > 0 || claims.length === 0) {
    const dataQualityScore = rule.requiredInputKeys.length > 0
      ? (rule.requiredInputKeys.length - missingInputs.length) / rule.requiredInputKeys.length
      : 0;
    return {
      ...base,
      status: "insufficient_data",
      missingInputs,
      dataQualityScore: Math.max(0, Math.min(1, dataQualityScore)),
    };
  }

  // Evaluate claims
  const relevantClaims = claims.filter(
    (c) => c.assetId === assetId && rule.requiredInputKeys.includes(c.claimKind),
  );

  const claimIds: string[] = [];
  const supportingEvidenceIds: string[] = [];
  const contradictingEvidenceIds: string[] = [];
  const staleEvidenceIds: string[] = [];
  const vetoReasons: string[] = [];

  for (const claim of relevantClaims) {
    claimIds.push(claim.claimId);

    for (const evidenceId of claim.evidenceIds) {
      const meta = evidenceMeta[evidenceId];
      if (!meta) continue;

      // Staleness check
      const isStale = meta.expiryAt !== null && meta.expiryAt < asOfDate;
      if (isStale) {
        staleEvidenceIds.push(evidenceId);
        // Stale evidence cannot support the rule
        continue;
      }

      // Evidence kind relevance
      if (rule.requiredEvidenceKinds.length > 0 && !rule.requiredEvidenceKinds.includes(meta.kind)) {
        continue;
      }

      if (claim.direction === "bullish" || claim.direction === "neutral") {
        supportingEvidenceIds.push(evidenceId);
      } else if (claim.direction === "bearish") {
        contradictingEvidenceIds.push(evidenceId);
      }
      // "unclear" direction: evidence is logged but contributes to neither side
    }
  }

  // Gate 3: Fatal contradiction check
  if (contradictingEvidenceIds.length > 0) {
    vetoReasons.push(
      `${contradictingEvidenceIds.length} contradicting evidence item(s) found.`,
    );
    return {
      ...base,
      status: "contradicted",
      claimIds,
      supportingEvidenceIds,
      contradictingEvidenceIds,
      staleEvidenceIds,
      vetoReasons,
      missingInputs,
      dataQualityScore: computeDataQuality(rule, missingInputs, staleEvidenceIds, evidenceMeta),
    };
  }

  // Gate 4: No supporting evidence after staleness filtering
  if (supportingEvidenceIds.length === 0) {
    return {
      ...base,
      status: "insufficient_data",
      claimIds,
      staleEvidenceIds,
      missingInputs,
      vetoReasons: staleEvidenceIds.length > 0
        ? [`${staleEvidenceIds.length} evidence item(s) excluded as stale.`]
        : ["No supporting evidence found."],
      dataQualityScore: computeDataQuality(rule, missingInputs, staleEvidenceIds, evidenceMeta),
    };
  }

  return {
    ...base,
    status: "supported",
    claimIds,
    supportingEvidenceIds,
    contradictingEvidenceIds,
    staleEvidenceIds,
    missingInputs,
    vetoReasons,
    dataQualityScore: computeDataQuality(rule, missingInputs, staleEvidenceIds, evidenceMeta),
  };
}

function computeDataQuality(
  rule: ResearchMethodRule,
  missingInputs: string[],
  staleEvidenceIds: string[],
  evidenceMeta: Record<string, { kind: string; expiryAt: string | null }>,
): number {
  const totalRequired = rule.requiredInputKeys.length;
  if (totalRequired === 0) return staleEvidenceIds.length === 0 ? 1 : 0.5;

  const providedCount = totalRequired - missingInputs.length;
  const baseScore = providedCount / totalRequired;
  // Penalise stale evidence
  const totalEvidence = Object.keys(evidenceMeta).length;
  const stalenessRatio = totalEvidence > 0 ? staleEvidenceIds.length / totalEvidence : 0;
  return Math.max(0, Math.min(1, baseScore * (1 - stalenessRatio * 0.5)));
}
