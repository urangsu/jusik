import type { DataStatus } from "@/domain/common/data-status";

export type RuntimeProviderId =
  | "kis"
  | "opendart"
  | "fmp_free"
  | "finnhub_free"
  | "alpha_vantage_free"
  | "yfinance_personal"
  | "stooq_personal";

export type ProviderRuntimePolicy = {
  providerId: RuntimeProviderId;
  cacheTtlMs: number;
  staleTtlMs: number;
  maxRetries: number;
  retryableStatuses: DataStatus[];
  staleAllowed: boolean;
};

export type ProviderRuntimeDecision =
  | { action: "use_cache"; reason: "fresh_cache" }
  | { action: "call_provider"; reason: "cache_miss" | "cache_stale" }
  | { action: "return_stale"; reason: "rate_limited_stale_fallback" }
  | { action: "rate_limited"; reason: "rate_limited_no_stale" };

export const DEFAULT_PROVIDER_RUNTIME_POLICIES: Record<RuntimeProviderId, ProviderRuntimePolicy> = {
  kis: {
    providerId: "kis",
    cacheTtlMs: 15_000,
    staleTtlMs: 5 * 60_000,
    maxRetries: 1,
    retryableStatuses: ["rate_limited", "error"],
    staleAllowed: true,
  },
  opendart: {
    providerId: "opendart",
    cacheTtlMs: 10 * 60_000,
    staleTtlMs: 24 * 60 * 60_000,
    maxRetries: 1,
    retryableStatuses: ["rate_limited", "error"],
    staleAllowed: true,
  },
  fmp_free: {
    providerId: "fmp_free",
    cacheTtlMs: 60_000,
    staleTtlMs: 30 * 60_000,
    maxRetries: 1,
    retryableStatuses: ["rate_limited", "error"],
    staleAllowed: true,
  },
  finnhub_free: {
    providerId: "finnhub_free",
    cacheTtlMs: 60_000,
    staleTtlMs: 30 * 60_000,
    maxRetries: 1,
    retryableStatuses: ["rate_limited", "error"],
    staleAllowed: true,
  },
  alpha_vantage_free: {
    providerId: "alpha_vantage_free",
    cacheTtlMs: 24 * 60 * 60_000,
    staleTtlMs: 48 * 60 * 60_000,
    maxRetries: 0,
    retryableStatuses: ["rate_limited"],
    staleAllowed: true,
  },
  yfinance_personal: {
    providerId: "yfinance_personal",
    cacheTtlMs: 5 * 60_000,
    staleTtlMs: 60 * 60_000,
    maxRetries: 0,
    retryableStatuses: ["rate_limited", "error"],
    staleAllowed: true,
  },
  stooq_personal: {
    providerId: "stooq_personal",
    cacheTtlMs: 5 * 60_000,
    staleTtlMs: 60 * 60_000,
    maxRetries: 0,
    retryableStatuses: ["rate_limited", "error"],
    staleAllowed: true,
  },
};
