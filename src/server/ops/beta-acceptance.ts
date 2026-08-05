/**
 * Beta Acceptance Evaluator
 *
 * This is a PURE function. It independently re-verifies every raw field from
 * ProviderRealDataSmokeResult against the target's SmokeTargetPolicy.
 *
 * It NEVER trusts runner-computed booleans (schemaValid, provenanceValid,
 * freshnessValid). Those booleans are convenience fields for display only.
 * The evaluator is the authoritative gate.
 *
 * A result passes ONLY when ALL of the following are true — independently:
 *   - attempted === true (not skipped)
 *   - envelopeStatus ∈ policy.allowedStatuses (no cached/stale/empty_allowed)
 *   - source === policy.expectedSource (exact string, not substring)
 *   - sourceTier === policy.expectedSourceTier (exact)
 *   - dataAvailable === true
 *   - schemaValid === true (verified by runner's Zod schema)
 *   - dataAsOf is a parseable ISO string, not null, not in the future
 *   - ageMs = (checkedAt - dataAsOf) ≥ 0 and ≤ policy.maxDataAgeMs
 */

import type {
  ProviderReadinessReport,
  ProviderRealDataSmokeResult,
  RuntimeProviderId,
} from "../../domain/ops/provider-readiness";
import type { SourceUsagePolicy } from "../../domain/source/provider-tier";
import {
  SMOKE_TARGET_POLICIES,
  REQUIRED_BETA_POLICIES,
  policyKey,
  type SmokeTargetPolicy,
} from "./provider-smoke-target-policy";

export type AcceptanceViolationReason =
  | "target_not_run"
  | "target_skipped"
  | "smoke_failed"
  | "data_unavailable"
  | "status_not_allowed"        // envelopeStatus ∉ allowedStatuses
  | "source_mismatch"           // raw source ≠ expectedSource
  | "tier_mismatch"             // raw sourceTier ≠ expectedSourceTier
  | "schema_invalid"
  | "data_as_of_missing"        // dataAsOf is null
  | "data_as_of_invalid"        // dataAsOf is not parseable
  | "data_as_of_future"         // dataAsOf > checkedAt
  | "freshness_exceeded"        // age > maxDataAgeMs
  | "attempted_smoke_failed";   // non-required attempted result failed

export type AcceptanceViolation = {
  target: Pick<SmokeTargetPolicy, "providerId" | "capability" | "symbol">;
  reason: AcceptanceViolationReason;
  detail: string;
};

export type BetaAcceptanceEvaluation = {
  exitCode: 0 | 1;
  violations: AcceptanceViolation[];
  noProviderConfigured: boolean;
  missingRequiredProviders: RuntimeProviderId[];
  verifiedTargets: SmokeTargetPolicy[];
};

function addViolation(
  violations: AcceptanceViolation[],
  policy: Pick<SmokeTargetPolicy, "providerId" | "capability" | "symbol">,
  reason: AcceptanceViolationReason,
  detail: string,
): void {
  violations.push({ target: { providerId: policy.providerId, capability: policy.capability, symbol: policy.symbol }, reason, detail });
}

/**
 * Independently verify one result against its policy without trusting any runner boolean.
 */
function verifyResult(
  policy: SmokeTargetPolicy,
  result: ProviderRealDataSmokeResult,
  violations: AcceptanceViolation[],
): boolean {
  const key = `${policy.providerId}/${policy.capability}/${policy.symbol}`;

  if (!result.attempted) {
    addViolation(violations, policy, "target_skipped", `Result for ${key} has attempted=false: ${result.skippedReason ?? "no reason"}`);
    return false;
  }

  // 1. Raw envelopeStatus must be in allowedStatuses — cached/stale/empty_allowed rejected
  const allowed = policy.allowedStatuses as readonly string[];
  if (!result.envelopeStatus || !allowed.includes(result.envelopeStatus)) {
    addViolation(violations, policy, "status_not_allowed",
      `envelopeStatus=${JSON.stringify(result.envelopeStatus)} is not in allowedStatuses=[${allowed.join(",")}]. cached/stale/empty_allowed are never valid Beta evidence.`);
    return false;
  }

  // 2. Data must be present
  if (!result.dataAvailable) {
    addViolation(violations, policy, "data_unavailable",
      `dataAvailable=false for ${key}. A successful envelope with null value is not acceptable evidence.`);
    return false;
  }

  // 3. Raw source must exactly match (not substring, not null)
  if (result.source !== policy.expectedSource) {
    addViolation(violations, policy, "source_mismatch",
      `source=${JSON.stringify(result.source)} ≠ expectedSource=${JSON.stringify(policy.expectedSource)}. Exact string match required. Substring match rejected.`);
    return false;
  }

  // 4. Raw sourceTier must exactly match
  if (result.sourceTier !== (policy.expectedSourceTier as string)) {
    addViolation(violations, policy, "tier_mismatch",
      `sourceTier=${JSON.stringify(result.sourceTier)} ≠ expectedSourceTier=${JSON.stringify(policy.expectedSourceTier)}.`);
    return false;
  }

  // 5. Schema must be valid (runner-computed, but presence of schemaIssues is authoritative)
  if (!result.schemaValid || result.schemaIssues.length > 0) {
    addViolation(violations, policy, "schema_invalid",
      result.schemaIssues.length > 0 ? result.schemaIssues.join("; ") : "schemaValid=false");
    return false;
  }

  // 6. dataAsOf-based freshness — evaluated independently from runner's freshnessValid boolean
  if (policy.maxDataAgeMs > 0) {
    if (!result.dataAsOf) {
      addViolation(violations, policy, "data_as_of_missing",
        `dataAsOf is null for ${key}. Freshness cannot be established without upstream observation time.`);
      return false;
    }

    const dataAsOfMs = Date.parse(result.dataAsOf);
    if (isNaN(dataAsOfMs)) {
      addViolation(violations, policy, "data_as_of_invalid",
        `dataAsOf=${JSON.stringify(result.dataAsOf)} is not a valid ISO datetime.`);
      return false;
    }

    const checkedAtMs = Date.parse(result.checkedAt);
    const ageMs = checkedAtMs - dataAsOfMs;

    if (ageMs < 0) {
      addViolation(violations, policy, "data_as_of_future",
        `dataAsOf=${result.dataAsOf} is in the future relative to checkedAt=${result.checkedAt}. ageMs=${ageMs}.`);
      return false;
    }

    if (ageMs > policy.maxDataAgeMs) {
      addViolation(violations, policy, "freshness_exceeded",
        `Data age ${ageMs}ms exceeds maxDataAgeMs=${policy.maxDataAgeMs}ms. dataAsOf=${result.dataAsOf}, checkedAt=${result.checkedAt}.`);
      return false;
    }
  }

  return true;
}

/**
 * Pure function: evaluate a ProviderReadinessReport against REQUIRED_BETA_POLICIES.
 *
 * Returns exitCode=0 ONLY when ALL required targets independently pass.
 * Runner booleans (provenanceValid, freshnessValid) are NEVER the gate.
 */
export function evaluateBetaAcceptance(
  report: ProviderReadinessReport,
  policies: readonly SmokeTargetPolicy[] = REQUIRED_BETA_POLICIES,
): BetaAcceptanceEvaluation {
  const violations: AcceptanceViolation[] = [];
  const verifiedTargets: SmokeTargetPolicy[] = [];

  const configuredReadyProviders = report.readiness.filter((c) => c.status === "ready");
  const noProviderConfigured = configuredReadyProviders.length === 0;
  const readyProviderIds = new Set(configuredReadyProviders.map((c) => c.providerId));
  const requiredProviderIds = [...new Set(policies.map((p) => p.providerId))];
  const missingRequiredProviders = requiredProviderIds.filter(
    (p) => !readyProviderIds.has(p),
  ) as RuntimeProviderId[];

  // Build lookup map
  const resultMap = new Map<string, ProviderRealDataSmokeResult>();
  for (const r of report.smokeResults) {
    resultMap.set(policyKey({ providerId: r.providerId, capability: r.capability, symbol: r.symbol ?? "" }), r);
  }

  for (const policy of policies) {
    const key = policyKey(policy);
    const result = resultMap.get(key);

    if (!result) {
      addViolation(violations, policy, "target_not_run",
        `${key} was not included in smokeResults. Update SMOKE_TARGET_POLICIES and PROVIDER_SMOKE_PROFILES to match.`);
      continue;
    }

    const ok = verifyResult(policy, result, violations);
    if (ok) {
      verifiedTargets.push(policy);
    }
  }

  // Also flag any non-required attempted failures (integrity check)
  const nonRequiredFailed = report.smokeResults.filter((r) => {
    const isRequired = policies.some(
      (p) => p.providerId === r.providerId && p.capability === r.capability && p.symbol === r.symbol
    );
    return !isRequired && r.attempted && !r.passed;
  });
  for (const failed of nonRequiredFailed) {
    addViolation(
      violations,
      { providerId: failed.providerId, capability: failed.capability, symbol: failed.symbol ?? "unknown" },
      "attempted_smoke_failed",
      `Non-required target ${policyKey({ providerId: failed.providerId, capability: failed.capability, symbol: failed.symbol ?? "" })} attempted but failed: ${failed.message ?? "no message"}`,
    );
  }

  const exitCode =
    noProviderConfigured ||
    missingRequiredProviders.length > 0 ||
    violations.length > 0
      ? 1
      : 0;

  return { exitCode, violations, noProviderConfigured, missingRequiredProviders, verifiedTargets };
}
