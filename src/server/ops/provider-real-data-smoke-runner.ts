import type {
  ProviderReadinessReport,
  ProviderRealDataSmokeResult,
  RuntimeProviderId,
  ProviderRealDataSmokeCapability,
} from "@/domain/ops/provider-readiness";
import { resolveProviderReadiness } from "./provider-readiness-resolver";

type SmokeProfile = {
  capability: ProviderRealDataSmokeCapability;
  symbol: string;
  region: "KR" | "US";
  endpoint: string;
};

/**
 * Per-provider smoke profiles.
 * Only providers that are "ready" will have their profiles executed.
 */
const PROVIDER_SMOKE_PROFILES: Record<RuntimeProviderId, SmokeProfile[]> = {
  kis: [
    {
      capability: "quote",
      symbol: "005930",
      region: "KR",
      endpoint: "/api/market/quote?symbol=005930&region=KR",
    },
    {
      capability: "ohlcv",
      symbol: "005930",
      region: "KR",
      endpoint: "/api/market/ohlcv?symbol=005930&region=KR&range=1M&interval=1D",
    },
  ],
  opendart: [
    {
      capability: "filings",
      symbol: "005930",
      region: "KR",
      endpoint: "/api/opendart/disclosures?stockCode=005930",
    },
  ],
  fmp_free: [
    {
      capability: "quote",
      symbol: "AAPL",
      region: "US",
      endpoint: "/api/market/quote?symbol=AAPL&region=US",
    },
    {
      capability: "ohlcv",
      symbol: "AAPL",
      region: "US",
      endpoint: "/api/market/ohlcv?symbol=AAPL&region=US&range=1M&interval=1D",
    },
  ],
  finnhub_free: [
    {
      capability: "quote",
      symbol: "AAPL",
      region: "US",
      endpoint: "/api/market/quote?symbol=AAPL&region=US",
    },
  ],
  alpha_vantage_free: [
    {
      capability: "quote",
      symbol: "AAPL",
      region: "US",
      endpoint: "/api/market/quote?symbol=AAPL&region=US",
    },
  ],
  yfinance_personal: [
    {
      capability: "quote",
      symbol: "005930.KS",
      region: "KR",
      endpoint: "/api/market/quote?symbol=005930.KS&region=KR",
    },
  ],
  stooq_personal: [
    {
      capability: "ohlcv",
      symbol: "AAPL",
      region: "US",
      endpoint: "/api/market/ohlcv?symbol=AAPL&region=US&range=1M&interval=1D",
    },
  ],
};

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
  if (typeof obj["status"] !== "string" || typeof obj["source"] !== "string") {
    return null;
  }
  return obj as DataEnvelopeShape;
}

const DATA_STATUSES = new Set([
  "real_time",
  "delayed",
  "eod",
  "cached",
  "stale",
  "empty_allowed",
]);

async function runSingleSmoke(
  providerId: RuntimeProviderId,
  profile: SmokeProfile,
  baseUrl: string
): Promise<ProviderRealDataSmokeResult> {
  const now = new Date().toISOString();
  const url = `${baseUrl}${profile.endpoint}`;

  let envelopeStatus: string | null = null;
  let dataAvailable = false;
  let source: string | null = null;
  let sourceTier: string | null = null;
  let warnings: string[] = [];
  let updatedAt: string | null = null;
  let message: string | null = null;
  let passed = false;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    if (res.status >= 500) {
      return {
        providerId,
        capability: profile.capability,
        symbol: profile.symbol,
        region: profile.region,
        attempted: true,
        skippedReason: null,
        envelopeStatus: "error",
        dataAvailable: false,
        source: null,
        sourceTier: null,
        warnings: [],
        updatedAt: null,
        message: `HTTP ${res.status}: 서버 오류`,
        passed: false,
        checkedAt: now,
      };
    }

    const raw = await res.json().catch(() => null);
    const envelope = parseEnvelope(raw);

    if (!envelope) {
      return {
        providerId,
        capability: profile.capability,
        symbol: profile.symbol,
        region: profile.region,
        attempted: true,
        skippedReason: null,
        envelopeStatus: null,
        dataAvailable: false,
        source: null,
        sourceTier: null,
        warnings: [],
        updatedAt: null,
        message: "DataEnvelope 구조가 없거나 source/status 필드 누락",
        passed: false,
        checkedAt: now,
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

    // api_required: configured provider got api_required → failure
    if (envelopeStatus === "api_required") {
      passed = false;
      message = message || "provider가 ready이나 api_required 응답을 반환했습니다.";
    } else if (DATA_STATUSES.has(envelopeStatus ?? "")) {
      dataAvailable =
        envelope.value !== null && envelope.value !== undefined;
      // empty list is allowed
      passed = true;
    } else if (envelopeStatus === "not_supported") {
      passed = false;
      message = message || "provider가 이 capability를 지원하지 않습니다.";
    } else {
      passed = false;
    }
  } catch {
    message = "네트워크 오류 또는 서버 미실행";
    passed = false;
  }

  return {
    providerId,
    capability: profile.capability,
    symbol: profile.symbol,
    region: profile.region,
    attempted: true,
    skippedReason: null,
    envelopeStatus,
    dataAvailable,
    source,
    sourceTier,
    warnings,
    updatedAt,
    message,
    passed,
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

  const PERSONAL_FALLBACK = new Set<RuntimeProviderId>([
    "yfinance_personal",
    "stooq_personal",
  ]);

  for (const check of readiness) {
    const profiles = PROVIDER_SMOKE_PROFILES[check.providerId] ?? [];

    // Skip personal fallback unless explicitly included
    if (PERSONAL_FALLBACK.has(check.providerId) && !includePersonalFallback) {
      for (const profile of profiles) {
        smokeResults.push({
          providerId: check.providerId,
          capability: profile.capability,
          symbol: profile.symbol,
          region: profile.region,
          attempted: false,
          skippedReason: "personal fallback는 명시적 flag 없이는 실행하지 않습니다.",
          envelopeStatus: null,
          dataAvailable: false,
          source: null,
          sourceTier: null,
          warnings: [],
          updatedAt: null,
          message: null,
          passed: true, // skip is not a failure
          checkedAt: now,
        });
      }
      continue;
    }

    // Not configured → skip (not a failure)
    if (!check.canRunSmoke) {
      for (const profile of profiles) {
        smokeResults.push({
          providerId: check.providerId,
          capability: profile.capability,
          symbol: profile.symbol,
          region: profile.region,
          attempted: false,
          skippedReason: `provider not configured: ${check.status}`,
          envelopeStatus: null,
          dataAvailable: false,
          source: null,
          sourceTier: null,
          warnings: [],
          updatedAt: null,
          message: check.message,
          passed: true, // not_configured is not a failure
          checkedAt: now,
        });
      }
      continue;
    }

    // Ready → run smoke
    for (const profile of profiles) {
      const result = await runSingleSmoke(check.providerId, profile, baseUrl);
      smokeResults.push(result);
    }
  }

  const readyCount = readiness.filter((r) => r.status === "ready").length;
  const notConfiguredCount = readiness.filter(
    (r) =>
      r.status === "not_configured" ||
      r.status === "personal_fallback_disabled"
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
