/**
 * Unified smoke target policy registry.
 * This is the SINGLE source of truth for:
 *   - required beta targets
 *   - per-target endpoint, expected provenance, allowed statuses, freshness window
 *
 * BOTH the smoke runner and the beta acceptance evaluator consume this.
 * No duplicate target constants exist elsewhere.
 */

import type { RuntimeProviderId, ProviderRealDataSmokeCapability } from "../../domain/ops/provider-readiness";
import type { SourceUsagePolicy } from "../../domain/source/provider-tier";
import type { DataStatus } from "../../domain/common/data-status";

export type SmokeTargetPolicy = {
  readonly providerId: RuntimeProviderId;
  readonly capability: ProviderRealDataSmokeCapability;
  readonly symbol: string;
  readonly region: "KR" | "US";
  readonly endpoint: string;
  /** maxDataAgeMs for dataAsOf-based freshness; 0 means no freshness check */
  readonly maxDataAgeMs: number;
  /** Exact source string — substring match is not acceptable */
  readonly expectedSource: string;
  readonly expectedSourceTier: SourceUsagePolicy;
  /** DataEnvelope statuses that count as live evidence. cached/stale/empty_allowed are never valid. */
  readonly allowedStatuses: readonly DataStatus[];
  /** Whether this target must pass for Beta GO */
  readonly requiredForBeta: boolean;
};

// Policy key used for lookups: `${providerId}/${capability}/${symbol}`
export function policyKey(p: Pick<SmokeTargetPolicy, "providerId" | "capability" | "symbol">): string {
  return `${p.providerId}/${p.capability}/${p.symbol}`;
}

/**
 * Immutable registry of all smoke targets.
 * Runner iterates this to know what to fetch.
 * Evaluator iterates this to know what to verify.
 */
export const SMOKE_TARGET_POLICIES: readonly SmokeTargetPolicy[] = [
  {
    providerId: "kis",
    capability: "quote",
    symbol: "005930",
    region: "KR",
    endpoint: "/api/market/quote?symbol=005930&region=KR",
    maxDataAgeMs: 20 * 60_000,
    expectedSource: "KIS Open API",
    expectedSourceTier: "official",
    allowedStatuses: ["real_time", "delayed"],
    requiredForBeta: true,
  },
  {
    providerId: "kis",
    capability: "ohlcv",
    symbol: "005930",
    region: "KR",
    endpoint: "/api/market/ohlcv?symbol=005930&region=KR&range=1M&interval=1D",
    maxDataAgeMs: 48 * 60 * 60_000,
    expectedSource: "KIS Open API",
    expectedSourceTier: "official",
    allowedStatuses: ["delayed", "eod"],
    requiredForBeta: true,
  },
  {
    providerId: "opendart",
    capability: "filings",
    symbol: "005930",
    region: "KR",
    endpoint: "/api/opendart/disclosures?stockCode=005930",
    maxDataAgeMs: 24 * 60 * 60_000,
    expectedSource: "OpenDART",
    expectedSourceTier: "official",
    allowedStatuses: ["eod"],
    requiredForBeta: true,
  },
  {
    providerId: "opendart",
    capability: "financials",
    symbol: "005930",
    region: "KR",
    endpoint: "/api/financials/statements?symbol=005930&region=KR",
    maxDataAgeMs: 24 * 60 * 60_000,
    expectedSource: "OpenDART",
    expectedSourceTier: "official",
    allowedStatuses: ["eod"],
    requiredForBeta: true,
  },
  {
    providerId: "finnhub_free",
    capability: "quote",
    symbol: "AAPL",
    region: "US",
    endpoint: "/api/market/quote?symbol=AAPL&region=US",
    maxDataAgeMs: 20 * 60_000,
    expectedSource: "Finnhub Free",
    expectedSourceTier: "free_limited",
    allowedStatuses: ["real_time", "delayed"],
    requiredForBeta: true,
  },
  // Personal fallback (not required for beta, tracked for monitoring only)
  {
    providerId: "yfinance_personal",
    capability: "quote",
    symbol: "005930.KS",
    region: "KR",
    endpoint: "/api/market/quote?symbol=005930.KS&region=KR",
    maxDataAgeMs: 0,
    expectedSource: "yfinance (personal)",
    expectedSourceTier: "personal_fallback",
    allowedStatuses: ["real_time", "delayed", "eod"],
    requiredForBeta: false,
  },
  {
    providerId: "stooq_personal",
    capability: "ohlcv",
    symbol: "AAPL",
    region: "US",
    endpoint: "/api/market/ohlcv?symbol=AAPL&region=US&range=1M&interval=1D",
    maxDataAgeMs: 0,
    expectedSource: "Stooq (personal)",
    expectedSourceTier: "personal_fallback",
    allowedStatuses: ["eod"],
    requiredForBeta: false,
  },
  {
    providerId: "fmp_free",
    capability: "quote",
    symbol: "AAPL",
    region: "US",
    endpoint: "/api/market/quote?symbol=AAPL&region=US",
    maxDataAgeMs: 20 * 60_000,
    expectedSource: "Financial Modeling Prep Free",
    expectedSourceTier: "free_limited",
    allowedStatuses: ["real_time", "delayed"],
    requiredForBeta: false,
  },
  {
    providerId: "fmp_free",
    capability: "ohlcv",
    symbol: "AAPL",
    region: "US",
    endpoint: "/api/market/ohlcv?symbol=AAPL&region=US&range=1M&interval=1D",
    maxDataAgeMs: 48 * 60 * 60_000,
    expectedSource: "Financial Modeling Prep Free",
    expectedSourceTier: "free_limited",
    allowedStatuses: ["delayed", "eod"],
    requiredForBeta: false,
  },
  {
    providerId: "alpha_vantage_free",
    capability: "quote",
    symbol: "AAPL",
    region: "US",
    endpoint: "/api/market/quote?symbol=AAPL&region=US",
    maxDataAgeMs: 20 * 60_000,
    expectedSource: "Alpha Vantage Free",
    expectedSourceTier: "free_limited",
    allowedStatuses: ["real_time", "delayed"],
    requiredForBeta: false,
  },
] as const;

/** Required beta targets (shortcut for acceptance evaluator) */
export const REQUIRED_BETA_POLICIES = SMOKE_TARGET_POLICIES.filter((p) => p.requiredForBeta);

/** Build a lookup map keyed by policyKey */
export function buildPolicyMap(
  policies: readonly SmokeTargetPolicy[],
): Map<string, SmokeTargetPolicy> {
  return new Map(policies.map((p) => [policyKey(p), p]));
}
