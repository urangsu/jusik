/**
 * Pure, deterministic method rule evaluator.
 *
 * Rules:
 * - Missing required inputs → "insufficient_data"
 * - Fatal contradicting evidence → "contradicted"
 * - Expired evidence is stale and cannot support the rule
 * - Unsupported market → "not_applicable"
 * - No evidence → insufficient_data (no synthetic claim created)
 * - dataQualityScore = (provided inputs with verified evidence / total required inputs), capped to [0, 1]
 */

import type { ResearchMethodRule } from "./method-rule";
import type { ResearchClaim } from "./research-claim";
import type { MethodRuleEvaluation } from "./method-evaluation";
import type { SignalVersion } from "@/domain/signals/signal-version";
import type { ResearchEvidenceRecord } from "./research-evidence-record";
import { resolveKnownAt } from "./resolve-evidence-quality";

export type EvaluateMethodRuleInput = {
  rule: ResearchMethodRule;
  assetId: string;
  market: "KR" | "US";
  claims: ResearchClaim[];
  evidenceRecords: ResearchEvidenceRecord[];
  /** ISO-8601 date for staleness evaluation */
  asOfDate: string;
  knownAt?: string;
  signalVersion: SignalVersion | null;
};

export function evaluateMethodRule(input: EvaluateMethodRuleInput): MethodRuleEvaluation {
  const { rule, assetId, market, claims, evidenceRecords, asOfDate, signalVersion } = input;
  const knownAt = input.knownAt || resolveKnownAt(asOfDate);

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
      const rec = evidenceRecords.find((r) => r.evidenceId === evidenceId);
      if (!rec) {
        // Missing record metadata -> unverified -> skip
        continue;
      }

      if (rec.assetId !== assetId) continue;
      if (rec.verificationStatus !== "verified") continue;
      if (!rec.dataAvailableAt || rec.dataAvailableAt > knownAt) continue;

      const isStale = rec.expiryAt !== null && rec.expiryAt < asOfDate;
      if (isStale) {
        staleEvidenceIds.push(evidenceId);
        continue;
      }

      if (rule.requiredEvidenceKinds.length > 0 && !rule.requiredEvidenceKinds.includes(rec.evidenceKind)) {
        continue;
      }

      if (claim.direction === "bullish") {
        supportingEvidenceIds.push(evidenceId);
      } else if (claim.direction === "bearish") {
        contradictingEvidenceIds.push(evidenceId);
      }
    }
  }

  // Gate 3: Fatal contradiction check (Veto)
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
      dataQualityScore: computeDataQuality(rule, missingInputs, staleEvidenceIds, evidenceRecords, claims),
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
      dataQualityScore: computeDataQuality(rule, missingInputs, staleEvidenceIds, evidenceRecords, claims),
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
    dataQualityScore: computeDataQuality(rule, missingInputs, staleEvidenceIds, evidenceRecords, claims),
  };
}

function computeDataQuality(
  rule: ResearchMethodRule,
  missingInputs: string[],
  staleEvidenceIds: string[],
  evidenceRecords: ResearchEvidenceRecord[],
  claims: ResearchClaim[]
): number {
  const totalRequired = rule.requiredInputKeys.length;
  if (totalRequired === 0) return 1.0;

  let metCount = 0;
  for (const key of rule.requiredInputKeys) {
    const hasEvidence = evidenceRecords.some(
      (rec) =>
        rec.verificationStatus === "verified" &&
        !staleEvidenceIds.includes(rec.evidenceId) &&
        rec.claimIds.some((cid) => {
          const claim = claims.find((c) => c.claimId === cid);
          return claim && claim.claimKind === key;
        })
    );
    if (hasEvidence) {
      metCount++;
    }
  }

  return metCount / totalRequired;
}
