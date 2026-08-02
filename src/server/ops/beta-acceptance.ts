import {
  ProviderReadinessReport,
  ProviderRealDataSmokeResult,
  RuntimeProviderId,
  ProviderRealDataSmokeCapability,
} from "../../domain/ops/provider-readiness";
import { SourceUsagePolicy } from "../../domain/source/provider-tier";
import { DataStatus } from "../../domain/common/data-status";

/**
 * A required target for Beta acceptance.
 * ALL entries must be satisfied for exit 0.
 * Uses exact source/tier matching — not substring.
 */
export type BetaAcceptanceTarget = {
  readonly providerId: RuntimeProviderId;
  readonly capability: ProviderRealDataSmokeCapability;
  readonly symbol: string;
  readonly expectedSource: string;
  readonly expectedSourceTier: SourceUsagePolicy;
  readonly allowedStatuses: readonly DataStatus[];
  readonly maxAgeMs: number;
};

export const REQUIRED_BETA_TARGETS: readonly BetaAcceptanceTarget[] = [
  {
    providerId: "kis",
    capability: "quote",
    symbol: "005930",
    expectedSource: "KIS Open API",
    expectedSourceTier: "official",
    allowedStatuses: ["real_time", "delayed"],
    maxAgeMs: 20 * 60_000,
  },
  {
    providerId: "kis",
    capability: "ohlcv",
    symbol: "005930",
    expectedSource: "KIS Open API",
    expectedSourceTier: "official",
    allowedStatuses: ["delayed", "eod"],
    maxAgeMs: 48 * 60 * 60_000,
  },
  {
    providerId: "opendart",
    capability: "filings",
    symbol: "005930",
    expectedSource: "OpenDART",
    expectedSourceTier: "official",
    allowedStatuses: ["eod"],
    maxAgeMs: 24 * 60 * 60_000,
  },
  {
    providerId: "opendart",
    capability: "financials",
    symbol: "005930",
    expectedSource: "OpenDART",
    expectedSourceTier: "official",
    allowedStatuses: ["eod"],
    maxAgeMs: 24 * 60 * 60_000,
  },
  {
    providerId: "finnhub_free",
    capability: "quote",
    symbol: "AAPL",
    expectedSource: "Finnhub Free",
    expectedSourceTier: "free_limited",
    allowedStatuses: ["real_time", "delayed"],
    maxAgeMs: 20 * 60_000,
  },
] as const;

export type AcceptanceViolation = {
  target: BetaAcceptanceTarget;
  reason:
    | "target_not_run"
    | "target_skipped"
    | "smoke_failed"
    | "data_unavailable"
    | "null_value_on_success"
    | "schema_invalid"
    | "provenance_invalid"
    | "freshness_invalid"
    | "attempted_smoke_failed"
    | "wrong_provider_source"
    | "stale_data_not_accepted"
    | "cached_not_accepted";
  detail: string;
};

export type BetaAcceptanceEvaluation = {
  exitCode: 0 | 1;
  violations: AcceptanceViolation[];
  noProviderConfigured: boolean;
  missingRequiredProviders: RuntimeProviderId[];
  verifiedTargets: BetaAcceptanceTarget[];
};

/**
 * Pure function: evaluate a ProviderReadinessReport against REQUIRED_BETA_TARGETS.
 *
 * No network, filesystem, or environment variable access.
 * Returns exitCode=0 ONLY when ALL targets are verified with:
 * - correct schema (schemaValid=true)
 * - exact canonical provenance (provenanceValid=true)
 * - fresh data (freshnessValid=true)
 * - no attempted smoke failures elsewhere in the report
 */
export function evaluateBetaAcceptance(
  report: ProviderReadinessReport,
  targets: readonly BetaAcceptanceTarget[] = REQUIRED_BETA_TARGETS
): BetaAcceptanceEvaluation {
  const violations: AcceptanceViolation[] = [];
  const verifiedTargets: BetaAcceptanceTarget[] = [];

  function addViolation(
    target: BetaAcceptanceTarget,
    reason: AcceptanceViolation["reason"],
    detail: string,
  ) {
    violations.push({ target, reason, detail });
  }

  // Check configured providers
  const configuredReadyProviders = report.readiness.filter((c) => c.status === "ready");
  const noProviderConfigured = configuredReadyProviders.length === 0;
  const readyProviderIds = new Set(configuredReadyProviders.map((c) => c.providerId));
  const requiredProviderIds = [...new Set(targets.map((t) => t.providerId))];
  const missingRequiredProviders = requiredProviderIds.filter(
    (p) => !readyProviderIds.has(p)
  ) as RuntimeProviderId[];

  // Evaluate each required target
  for (const target of targets) {
    const match = report.smokeResults.find(
      (r) =>
        r.providerId === target.providerId &&
        r.capability === target.capability &&
        r.symbol === target.symbol
    );

    if (!match) {
      addViolation(target, "target_not_run",
        `${target.providerId}/${target.capability}/${target.symbol} was not included in smokeResults. Update PROVIDER_SMOKE_PROFILES.`
      );
      continue;
    }

    if (!match.attempted) {
      addViolation(target, "target_skipped", `Skipped: ${match.skippedReason ?? "unknown reason"}`);
      continue;
    }

    if (!match.passed) {
      addViolation(target, "smoke_failed", `Smoke test failed: ${match.message ?? "no message"}`);
      continue;
    }

    // data must be available
    if (!match.dataAvailable) {
      addViolation(target, "null_value_on_success",
        `envelopeStatus=${match.envelopeStatus} but value=null. A success envelope with null value is not acceptable evidence.`
      );
      continue;
    }

    // Schema must be valid (schemaValid from runner)
    if (!match.schemaValid) {
      addViolation(target, "schema_invalid",
        match.schemaIssues.length > 0 ? match.schemaIssues.join("; ") : "schema validation failed"
      );
      continue;
    }

    // Provenance must exactly match — exact source string and tier
    if (!match.provenanceValid) {
      addViolation(target, "provenance_invalid",
        `Expected source="${target.expectedSource}" tier="${target.expectedSourceTier}" but got source="${match.source ?? "null"}" tier="${match.sourceTier ?? "null"}". Exact match required.`
      );
      continue;
    }

    // Freshness must be valid (freshnessValid from runner)
    if (!match.freshnessValid) {
      addViolation(target, "freshness_invalid",
        `updatedAt=${match.updatedAt} ageMs=${match.ageMs} maxAgeMs=${target.maxAgeMs}`
      );
      continue;
    }

    verifiedTargets.push(target);
  }

  // After checking required targets, check for any attempted smoke failures
  const attemptedFailures = report.smokeResults.filter((r) => r.attempted && !r.passed);
  if (attemptedFailures.length > 0 && violations.length === 0) {
    const failed = attemptedFailures[0];
    const matchingTarget = targets.find(
      (t) =>
        t.providerId === failed.providerId &&
        t.capability === failed.capability &&
        t.symbol === failed.symbol
    ) ?? {
      providerId: failed.providerId,
      capability: failed.capability,
      symbol: failed.symbol ?? "unknown",
      expectedSource: failed.source ?? "unknown",
      expectedSourceTier: (failed.sourceTier ?? "manual_import") as SourceUsagePolicy,
      allowedStatuses: [] as readonly DataStatus[],
      maxAgeMs: 0,
    };
    addViolation(matchingTarget, "attempted_smoke_failed", failed.message ?? "attempted smoke failed");
  }

  const exitCode =
    noProviderConfigured ||
    missingRequiredProviders.length > 0 ||
    violations.length > 0
      ? 1
      : 0;

  return {
    exitCode,
    violations,
    noProviderConfigured,
    missingRequiredProviders,
    verifiedTargets,
  };
}
