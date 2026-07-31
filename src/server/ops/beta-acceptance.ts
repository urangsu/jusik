import {
  ProviderReadinessReport,
  ProviderRealDataSmokeResult,
  RuntimeProviderId,
  ProviderRealDataSmokeCapability,
} from "../../domain/ops/provider-readiness";

/**
 * A required target for Beta acceptance.
 * ALL entries must be satisfied for exit 0.
 */
export type BetaAcceptanceTarget = {
  readonly providerId: RuntimeProviderId;
  readonly capability: ProviderRealDataSmokeCapability;
  readonly symbol: string;
  /**
   * expectedSource: a lowercase substring that must appear in the actual
   * envelope `source` field. Used to verify provider identity.
   * e.g. "kis" must appear in "KIS Open API"
   */
  readonly expectedSourceSubstring: string;
  readonly requireLiveFreshness: boolean;
};

export const REQUIRED_BETA_TARGETS: readonly BetaAcceptanceTarget[] = [
  {
    providerId: "kis",
    capability: "quote",
    symbol: "005930",
    expectedSourceSubstring: "kis",
    requireLiveFreshness: true,
  },
  {
    providerId: "kis",
    capability: "ohlcv",
    symbol: "005930",
    expectedSourceSubstring: "kis",
    requireLiveFreshness: true,
  },
  {
    providerId: "opendart",
    capability: "filings",
    symbol: "005930",
    expectedSourceSubstring: "opendart",
    requireLiveFreshness: false,
  },
  {
    providerId: "opendart",
    capability: "financials",
    symbol: "005930",
    expectedSourceSubstring: "opendart",
    requireLiveFreshness: false,
  },
  {
    providerId: "finnhub_free",
    capability: "quote",
    symbol: "AAPL",
    expectedSourceSubstring: "finnhub",
    requireLiveFreshness: true,
  },
] as const;

const LIVE_STATUSES = new Set(["real_time", "delayed"]);
const EOD_STATUSES = new Set(["real_time", "delayed", "eod"]);

export type AcceptanceViolation = {
  target: BetaAcceptanceTarget;
  reason:
    | "target_not_run"
    | "target_skipped"
    | "smoke_failed"
    | "data_unavailable"
    | "null_value_on_success"
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
 * Returns exitCode=0 ONLY when all targets are verified with live data
 * and correct provider identity.
 */
export function evaluateBetaAcceptance(
  report: ProviderReadinessReport,
  targets: readonly BetaAcceptanceTarget[] = REQUIRED_BETA_TARGETS
): BetaAcceptanceEvaluation {
  const violations: AcceptanceViolation[] = [];
  const verifiedTargets: BetaAcceptanceTarget[] = [];

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
      violations.push({
        target,
        reason: "target_not_run",
        detail: `${target.providerId}/${target.capability}/${target.symbol} was not included in smokeResults. Update PROVIDER_SMOKE_PROFILES.`,
      });
      continue;
    }

    if (!match.attempted) {
      violations.push({
        target,
        reason: "target_skipped",
        detail: `Skipped: ${match.skippedReason ?? "unknown reason"}`,
      });
      continue;
    }

    if (!match.passed) {
      violations.push({
        target,
        reason: "smoke_failed",
        detail: `Smoke test failed: ${match.message ?? "no message"}`,
      });
      continue;
    }

    // Verify data availability — null value on success status is not acceptable
    if (!match.dataAvailable) {
      violations.push({
        target,
        reason: "null_value_on_success",
        detail: `envelopeStatus=${match.envelopeStatus} but value=null. A success envelope with null value is not acceptable evidence.`,
      });
      continue;
    }

    // Verify provider source identity — route must have served from the expected provider
    const actualSource = (match.source ?? "").toLowerCase();
    if (!actualSource.includes(target.expectedSourceSubstring)) {
      violations.push({
        target,
        reason: "wrong_provider_source",
        detail: `Expected source containing '${target.expectedSourceSubstring}' but got '${match.source ?? "null"}'. Another provider may have answered instead.`,
      });
      continue;
    }

    // Verify freshness — stale and cached are not live evidence
    const envelopeStatus = match.envelopeStatus ?? "";
    if (target.requireLiveFreshness) {
      if (!LIVE_STATUSES.has(envelopeStatus)) {
        violations.push({
          target,
          reason: envelopeStatus === "cached" ? "cached_not_accepted" : "stale_data_not_accepted",
          detail: `envelopeStatus=${envelopeStatus} is not live evidence. Live targets require real_time or delayed.`,
        });
        continue;
      }
    } else {
      if (!EOD_STATUSES.has(envelopeStatus)) {
        violations.push({
          target,
          reason: "stale_data_not_accepted",
          detail: `envelopeStatus=${envelopeStatus} is not acceptable. Expected one of: real_time, delayed, eod.`,
        });
        continue;
      }
    }

    verifiedTargets.push(target);
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
