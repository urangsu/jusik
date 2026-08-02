import type {
  ProviderReadinessReport,
  ProviderRealDataSmokeResult,
  RuntimeProviderId,
  ProviderRealDataSmokeCapability,
} from "@/domain/ops/provider-readiness";
import { resolveProviderReadiness } from "./provider-readiness-resolver";
import {
  validateSmokeValue,
  validateSmokeProvenance,
  validateSmokeFreshness,
  PROVIDER_PROVENANCE,
} from "./provider-smoke-contracts";

type SmokeProfile = {
  capability: ProviderRealDataSmokeCapability;
  symbol: string;
  region: "KR" | "US";
  endpoint: string;
  /** maxAgeMs for freshness validation — 0 means no freshness check */
  maxAgeMs: number;
};

/**
 * Per-provider smoke profiles.
 * Only providers that are "ready" will have their profiles executed.
 * For KIS/Finnhub market capabilities, providerId is pinned via URL parameter.
 */
const PROVIDER_SMOKE_PROFILES: Record<RuntimeProviderId, SmokeProfile[]> = {
  kis: [
    {
      capability: "quote",
      symbol: "005930",
      region: "KR",
      endpoint: "/api/market/quote?symbol=005930&region=KR",
      maxAgeMs: 20 * 60 * 1000, // 20 minutes
    },
    {
      capability: "ohlcv",
      symbol: "005930",
      region: "KR",
      endpoint: "/api/market/ohlcv?symbol=005930&region=KR&range=1M&interval=1D",
      maxAgeMs: 48 * 60 * 60 * 1000, // 48 hours
    },
  ],
  opendart: [
    {
      capability: "filings",
      symbol: "005930",
      region: "KR",
      endpoint: "/api/opendart/disclosures?stockCode=005930",
      maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
    },
    {
      capability: "financials",
      symbol: "005930",
      region: "KR",
      endpoint: "/api/financials/statements?symbol=005930&region=KR",
      maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
    },
  ],
  fmp_free: [
    {
      capability: "quote",
      symbol: "AAPL",
      region: "US",
      endpoint: "/api/market/quote?symbol=AAPL&region=US",
      maxAgeMs: 20 * 60 * 1000,
    },
    {
      capability: "ohlcv",
      symbol: "AAPL",
      region: "US",
      endpoint: "/api/market/ohlcv?symbol=AAPL&region=US&range=1M&interval=1D",
      maxAgeMs: 48 * 60 * 60 * 1000,
    },
  ],
  finnhub_free: [
    {
      capability: "quote",
      symbol: "AAPL",
      region: "US",
      endpoint: "/api/market/quote?symbol=AAPL&region=US",
      maxAgeMs: 20 * 60 * 1000,
    },
  ],
  alpha_vantage_free: [
    {
      capability: "quote",
      symbol: "AAPL",
      region: "US",
      endpoint: "/api/market/quote?symbol=AAPL&region=US",
      maxAgeMs: 20 * 60 * 1000,
    },
  ],
  yfinance_personal: [
    {
      capability: "quote",
      symbol: "005930.KS",
      region: "KR",
      endpoint: "/api/market/quote?symbol=005930.KS&region=KR",
      maxAgeMs: 0,
    },
  ],
  stooq_personal: [
    {
      capability: "ohlcv",
      symbol: "AAPL",
      region: "US",
      endpoint: "/api/market/ohlcv?symbol=AAPL&region=US&range=1M&interval=1D",
      maxAgeMs: 0,
    },
  ],
};

// Providers that have canonical provenance entries (can verify source identity)
const PROVENANCE_PROVIDERS = new Set(Object.keys(PROVIDER_PROVENANCE) as RuntimeProviderId[]);

// Capabilities for which schema validation is supported
const SCHEMA_SUPPORTED = new Set<ProviderRealDataSmokeCapability>(["quote", "ohlcv", "filings", "financials"]);

type DataEnvelopeShape = {
  value?: unknown;
  status?: string;
  source?: string;
  sourceTier?: string;
  warnings?: unknown[];
  updatedAt?: string | null;
  message?: string;
};

function parseEnvelope(raw: unknown): DataEnvelopeShape | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj["status"] !== "string" || typeof obj["source"] !== "string") return null;
  return obj as DataEnvelopeShape;
}

const DATA_STATUSES = new Set([
  "real_time", "delayed", "eod", "cached", "stale", "empty_allowed",
]);

/**
 * Build a failed smoke result with all required fields populated.
 * This is the single place that constructs "failed" results — no partial objects.
 */
function failedSmoke(
  providerId: RuntimeProviderId,
  profile: SmokeProfile,
  message: string,
  now: string,
): ProviderRealDataSmokeResult {
  return {
    providerId,
    capability: profile.capability,
    symbol: profile.symbol,
    region: profile.region,
    attempted: false,
    skippedReason: message,
    envelopeStatus: null,
    dataAvailable: false,
    source: null,
    sourceTier: null,
    warnings: [],
    updatedAt: null,
    message,
    passed: false,
    schemaValid: false,
    schemaIssues: [message],
    provenanceValid: false,
    freshnessValid: false,
    ageMs: null,
    checkedAt: now,
  };
}

function skippedSmoke(
  providerId: RuntimeProviderId,
  profile: SmokeProfile,
  reason: string,
  now: string,
): ProviderRealDataSmokeResult {
  return {
    providerId,
    capability: profile.capability,
    symbol: profile.symbol,
    region: profile.region,
    attempted: false,
    skippedReason: reason,
    envelopeStatus: null,
    dataAvailable: false,
    source: null,
    sourceTier: null,
    warnings: [],
    updatedAt: null,
    message: null,
    passed: true, // skip is not a failure
    schemaValid: false,
    schemaIssues: [],
    provenanceValid: false,
    freshnessValid: false,
    ageMs: null,
    checkedAt: now,
  };
}

// Allowed internal origins — smoke key is NEVER sent to external origins
const ALLOWED_LOOPBACK_ORIGINS = new Set([
  "http://127.0.0.1:3000",
  "http://localhost:3000",
]);

function isAllowedSmokeOrigin(baseUrl: string): boolean {
  const internalOrigin = process.env.INTERNAL_APP_ORIGIN;
  try {
    const origin = new URL(baseUrl).origin;
    return (
      ALLOWED_LOOPBACK_ORIGINS.has(origin) ||
      (!!internalOrigin && origin === new URL(internalOrigin).origin)
    );
  } catch {
    return false;
  }
}

async function runSingleSmoke(
  providerId: RuntimeProviderId,
  profile: SmokeProfile,
  baseUrl: string
): Promise<ProviderRealDataSmokeResult> {
  const now = new Date().toISOString();

  // Security: only send smoke key to allowed internal origins
  if (!isAllowedSmokeOrigin(baseUrl)) {
    return failedSmoke(providerId, profile, `보안: baseUrl '${new URL(baseUrl).hostname}'은 허용된 내부 origin이 아닙니다.`, now);
  }

  const smokeKey = process.env.INTERNAL_SMOKE_KEY;
  if (!smokeKey) {
    return failedSmoke(providerId, profile, "INTERNAL_SMOKE_KEY가 설정되지 않았습니다.", now);
  }

  // Build URL and pin provider for market capabilities
  let urlObj: URL;
  try {
    urlObj = new URL(profile.endpoint, baseUrl);
  } catch {
    return failedSmoke(providerId, profile, "잘못된 smoke endpoint URL", now);
  }

  if (profile.capability === "quote" || profile.capability === "ohlcv") {
    urlObj.searchParams.set("providerId", providerId);
  }

  let envelopeStatus: string | null = null;
  let dataAvailable = false;
  let source: string | null = null;
  let sourceTier: string | null = null;
  let warnings: string[] = [];
  let updatedAt: string | null = null;
  let message: string | null = null;
  let passed = false;
  let schemaValid = false;
  let schemaIssues: string[] = [];
  let provenanceValid = false;
  let freshnessValid = false;
  let ageMs: number | null = null;

  try {
    const res = await fetch(urlObj, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-internal-smoke-key": smokeKey,
      },
    });

    if (res.status >= 500) {
      return {
        providerId, capability: profile.capability, symbol: profile.symbol, region: profile.region,
        attempted: true, skippedReason: null,
        envelopeStatus: "error", dataAvailable: false, source: null, sourceTier: null,
        warnings: [], updatedAt: null, message: `HTTP ${res.status}: 서버 오류`,
        passed: false, schemaValid: false, schemaIssues: [`HTTP ${res.status}`],
        provenanceValid: false, freshnessValid: false, ageMs: null, checkedAt: now,
      };
    }

    const raw = await res.json().catch(() => null);
    const envelope = parseEnvelope(raw);

    if (!envelope) {
      return {
        providerId, capability: profile.capability, symbol: profile.symbol, region: profile.region,
        attempted: true, skippedReason: null,
        envelopeStatus: null, dataAvailable: false, source: null, sourceTier: null,
        warnings: [], updatedAt: null, message: "DataEnvelope 구조가 없거나 source/status 필드 누락",
        passed: false, schemaValid: false, schemaIssues: ["missing envelope structure"],
        provenanceValid: false, freshnessValid: false, ageMs: null, checkedAt: now,
      };
    }

    envelopeStatus = envelope.status ?? null;
    source = envelope.source ?? null;
    sourceTier = envelope.sourceTier ?? null;
    updatedAt = envelope.updatedAt ?? null;
    warnings = Array.isArray(envelope.warnings)
      ? (envelope.warnings as string[]).filter((w) => typeof w === "string")
      : [];
    message = envelope.message ?? null;

    if (envelopeStatus === "api_required") {
      passed = false;
      message = message || "provider가 ready이나 api_required 응답을 반환했습니다.";
    } else if (DATA_STATUSES.has(envelopeStatus ?? "")) {
      dataAvailable = envelope.value !== null && envelope.value !== undefined;
      passed = true;
    } else if (envelopeStatus === "not_supported") {
      passed = false;
      message = message || "provider가 이 capability를 지원하지 않습니다.";
    } else {
      passed = false;
    }

    // Schema validation (only for supported capabilities with non-null value)
    if (passed && dataAvailable && SCHEMA_SUPPORTED.has(profile.capability)) {
      const cap = profile.capability as Exclude<ProviderRealDataSmokeCapability, "news">;
      const schemaResult = validateSmokeValue(cap, envelope.value);
      schemaValid = schemaResult.success;
      if (!schemaResult.success) {
        schemaIssues = (schemaResult.error.issues as unknown as Array<{ path: (string|number)[]; message: string }>).map((i) => `${i.path.join(".")}: ${i.message}`);
        passed = false;
        message = `Schema validation failed: ${schemaIssues[0]}`;
      }
    }

    // Provenance validation (only for providers with canonical source entries)
    if (passed && PROVENANCE_PROVIDERS.has(providerId)) {
      const provResult = validateSmokeProvenance(
        providerId as keyof typeof PROVIDER_PROVENANCE,
        source,
        sourceTier,
      );
      provenanceValid = provResult.success;
      if (!provResult.success) {
        passed = false;
        message = `Provenance mismatch: expected source="${provResult.expected.source}" tier="${provResult.expected.sourceTier}" but got source="${source}" tier="${sourceTier}"`;
      }
    }

    // Freshness validation (only when maxAgeMs > 0)
    if (passed && profile.maxAgeMs > 0) {
      const freshnessResult = validateSmokeFreshness(updatedAt, profile.maxAgeMs);
      freshnessValid = freshnessResult.valid;
      ageMs = freshnessResult.ageMs;
      if (!freshnessValid) {
        passed = false;
        message = `Freshness invalid: updatedAt=${updatedAt}, ageMs=${ageMs}, maxAgeMs=${profile.maxAgeMs}`;
      }
    }
  } catch {
    message = "네트워크 오류 또는 서버 미실행";
    passed = false;
  }

  return {
    providerId, capability: profile.capability, symbol: profile.symbol, region: profile.region,
    attempted: true, skippedReason: null,
    envelopeStatus, dataAvailable, source, sourceTier, warnings, updatedAt, message,
    passed, schemaValid, schemaIssues, provenanceValid, freshnessValid, ageMs,
    checkedAt: now,
  };
}

/**
 * Runs provider-specific real data smoke tests.
 *
 * Only providers that are "ready" (all required keys configured) will be tested.
 * Personal fallback providers are skipped unless includePersonalFallback=true.
 *
 * Requires a running server at baseUrl.
 */
export async function runProviderRealDataSmoke(input?: {
  includePersonalFallback?: boolean;
  baseUrl?: string;
}): Promise<ProviderReadinessReport> {
  const baseUrl = input?.baseUrl ?? "http://localhost:3000";
  const includePersonalFallback = input?.includePersonalFallback ?? false;

  const now = new Date().toISOString();
  const readiness = resolveProviderReadiness();
  const smokeResults: ProviderRealDataSmokeResult[] = [];

  const PERSONAL_FALLBACK = new Set<RuntimeProviderId>(["yfinance_personal", "stooq_personal"]);

  for (const check of readiness) {
    const profiles = PROVIDER_SMOKE_PROFILES[check.providerId] ?? [];

    if (PERSONAL_FALLBACK.has(check.providerId) && !includePersonalFallback) {
      for (const profile of profiles) {
        smokeResults.push(
          skippedSmoke(check.providerId, profile, "personal fallback는 명시적 flag 없이는 실행하지 않습니다.", now)
        );
      }
      continue;
    }

    if (!check.canRunSmoke) {
      for (const profile of profiles) {
        smokeResults.push(
          skippedSmoke(check.providerId, profile, `provider not configured: ${check.status}`, now)
        );
      }
      continue;
    }

    for (const profile of profiles) {
      const result = await runSingleSmoke(check.providerId, profile, baseUrl);
      smokeResults.push(result);
    }
  }

  const readyCount = readiness.filter((r) => r.status === "ready").length;
  const notConfiguredCount = readiness.filter(
    (r) => r.status === "not_configured" || r.status === "personal_fallback_disabled"
  ).length;
  const failureCount = smokeResults.filter((r) => !r.passed && r.attempted).length;

  return {
    id: `readiness_${Date.now()}`,
    readiness,
    smokeResults,
    readyCount,
    notConfiguredCount,
    failureCount,
    createdAt: now,
  };
}
