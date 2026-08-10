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
} from "./provider-smoke-contracts";
import {
  SMOKE_TARGET_POLICIES,
  policyKey,
  type SmokeTargetPolicy,
} from "./provider-smoke-target-policy";

// ── Constants ──────────────────────────────────────────────────────────────
const SMOKE_TIMEOUT_MS = 10_000; // 10 seconds per probe
const PERSONAL_FALLBACK = new Set<RuntimeProviderId>(["yfinance_personal", "stooq_personal"]);
const DATA_STATUSES = new Set(["real_time", "delayed", "eod", "cached", "stale", "empty_allowed"]);
const SCHEMA_SUPPORTED = new Set<ProviderRealDataSmokeCapability>(["quote", "ohlcv", "filings", "financials"]);

// ── Allowed loopback origins — smoke key NEVER leaves these ────────────────
const ALLOWED_LOOPBACK_ORIGINS = new Set(["http://127.0.0.1:3000", "http://localhost:3000"]);

function resolveAllowedOrigin(baseUrl: string): string | null {
  const internalOrigin = process.env.INTERNAL_APP_ORIGIN;
  try {
    const origin = new URL(baseUrl).origin;
    if (ALLOWED_LOOPBACK_ORIGINS.has(origin)) return origin;
    if (internalOrigin) {
      try {
        if (origin === new URL(internalOrigin).origin) return origin;
      } catch { /* ignore */ }
    }
    return null;
  } catch {
    return null;
  }
}

// ── DataEnvelope parser ───────────────────────────────────────────────────
type DataEnvelopeShape = {
  value?: unknown;
  status?: string;
  source?: string;
  sourceTier?: string;
  warnings?: unknown[];
  updatedAt?: string | null;
  dataAsOf?: string | null;
  message?: string;
};

function parseEnvelope(raw: unknown): DataEnvelopeShape | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj["status"] !== "string" || typeof obj["source"] !== "string") return null;
  return obj as DataEnvelopeShape;
}

// ── Result constructors ───────────────────────────────────────────────────

function makeSkipped(
  policy: SmokeTargetPolicy,
  reason: string,
  now: string,
): ProviderRealDataSmokeResult {
  return {
    providerId: policy.providerId,
    capability: policy.capability,
    symbol: policy.symbol,
    region: policy.region,
    attempted: false,
    skippedReason: reason,
    envelopeStatus: null,
    dataAvailable: false,
    source: null,
    sourceTier: null,
    warnings: [],
    updatedAt: null,
    dataAsOf: null,
    message: null,
    passed: true, // skipped = not a failure for non-required
    schemaValid: false,
    schemaIssues: [],
    provenanceValid: false,
    freshnessValid: false,
    ageMs: null,
    checkedAt: now,
  };
}

function makeTransportError(
  policy: SmokeTargetPolicy,
  message: string,
  now: string,
): ProviderRealDataSmokeResult {
  return {
    providerId: policy.providerId,
    capability: policy.capability,
    symbol: policy.symbol,
    region: policy.region,
    attempted: true,
    skippedReason: null,
    envelopeStatus: null,
    dataAvailable: false,
    source: null,
    sourceTier: null,
    warnings: [],
    updatedAt: null,
    dataAsOf: null,
    message,
    passed: false,
    schemaValid: false,
    schemaIssues: [],
    provenanceValid: false,
    freshnessValid: false,
    ageMs: null,
    checkedAt: now,
  };
}

// ── Single probe ──────────────────────────────────────────────────────────

async function runSingleSmoke(
  policy: SmokeTargetPolicy,
  allowedOrigin: string,
  smokeKey: string,
  now: string,
): Promise<ProviderRealDataSmokeResult> {
  // Build URL with provider pinning for market capabilities
  let url: URL;
  try {
    url = new URL(policy.endpoint, allowedOrigin);
  } catch {
    return makeTransportError(policy, "잘못된 smoke endpoint URL", now);
  }

  if (policy.capability === "quote" || policy.capability === "ohlcv") {
    url.searchParams.set("providerId", policy.providerId);
  }

  let res: Response;
  try {
    // Task 4: redirect=manual prevents credential leakage across redirects
    // Task 4: AbortSignal.timeout enforces hard timeout
    res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-internal-smoke-key": smokeKey,
      },
      redirect: "manual",                             // Task 4: NEVER follow redirects
      signal: AbortSignal.timeout(SMOKE_TIMEOUT_MS),  // Task 4: hard timeout
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return makeTransportError(policy, isTimeout ? "요청 시간 초과" : "네트워크 오류 또는 서버 미실행", now);
  }

  // Task 4: reject ALL 3xx before parsing — smoke key must not leak to redirected origin
  if (res.status >= 300 && res.status < 400) {
    return makeTransportError(policy, `리다이렉트 거부 (HTTP ${res.status}): smoke 키가 다른 origin으로 전달되지 않습니다.`, now);
  }

  if (res.status >= 500) {
    return makeTransportError(policy, `HTTP ${res.status}: 서버 오류`, now);
  }

  const raw = await res.json().catch(() => null);
  const envelope = parseEnvelope(raw);

  if (!envelope) {
    return makeTransportError(policy, "DataEnvelope 구조가 없거나 source/status 필드 누락", now);
  }

  const envelopeStatus = envelope.status ?? null;
  const source = envelope.source ?? null;
  const sourceTier = envelope.sourceTier ?? null;
  const updatedAt = envelope.updatedAt ?? null;
  // Task 3: prefer envelope.dataAsOf if server provides it; otherwise leave null
  const dataAsOf = (envelope.dataAsOf ?? null) as string | null;
  const warnings = Array.isArray(envelope.warnings)
    ? (envelope.warnings as string[]).filter((w) => typeof w === "string")
    : [];
  const message = envelope.message ?? null;

  let passed = false;
  let dataAvailable = false;
  let schemaValid = false;
  let schemaIssues: string[] = [];
  let provenanceValid = false;
  let freshnessValid = false;
  let ageMs: number | null = null;
  let finalMessage: string | null = message;

  if (envelopeStatus === "api_required") {
    finalMessage = finalMessage || "provider가 ready이나 api_required 응답을 반환했습니다.";
  } else if (DATA_STATUSES.has(envelopeStatus ?? "")) {
    dataAvailable = envelope.value !== null && envelope.value !== undefined;
    passed = dataAvailable;
  } else if (envelopeStatus === "not_supported") {
    finalMessage = finalMessage || "provider가 이 capability를 지원하지 않습니다.";
  }

  // Schema validation
  if (passed && SCHEMA_SUPPORTED.has(policy.capability)) {
    const cap = policy.capability as Exclude<ProviderRealDataSmokeCapability, "news">;
    const schemaResult = validateSmokeValue(cap, envelope.value, {
      expectedSymbol: policy.symbol,
      expectedRegion: policy.region,
      expectedSource: policy.expectedSource,
    });
    schemaValid = schemaResult.success;
    if (!schemaResult.success) {
      schemaIssues = (schemaResult.error.issues as unknown as Array<{ path: (string | number)[]; message: string }>)
        .map((i) => `${i.path.join(".")}: ${i.message}`);
      passed = false;
      finalMessage = `Schema validation failed: ${schemaIssues[0]}`;
    }
  }

  // Provenance validation (using policy-derived expected values)
  if (passed) {
    const provResult = validateSmokeProvenance(
      policy.expectedSource,
      policy.expectedSourceTier,
      source,
      sourceTier,
    );
    provenanceValid = provResult.success;
    if (!provResult.success) {
      passed = false;
      finalMessage = `Provenance mismatch: expected source="${policy.expectedSource}" tier="${policy.expectedSourceTier}" but got source="${source}" tier="${sourceTier}"`;
    }
  }

  // Task 3: freshness from dataAsOf (upstream observation time), not updatedAt (fetch time)
  if (passed && policy.maxDataAgeMs > 0) {
    const checkedAtMs = Date.parse(now);
    const freshnessResult = validateSmokeFreshness(dataAsOf, policy.maxDataAgeMs, checkedAtMs);
    freshnessValid = freshnessResult.valid;
    ageMs = freshnessResult.ageMs;
    if (!freshnessValid) {
      passed = false;
      finalMessage = `Freshness invalid: dataAsOf=${dataAsOf}, ageMs=${ageMs}, maxDataAgeMs=${policy.maxDataAgeMs}`;
    }
  }

  return {
    providerId: policy.providerId,
    capability: policy.capability,
    symbol: policy.symbol,
    region: policy.region,
    attempted: true,
    skippedReason: null,
    envelopeStatus,
    dataAvailable,
    source,
    sourceTier,
    warnings,
    updatedAt,
    dataAsOf,
    message: finalMessage,
    passed,
    schemaValid,
    schemaIssues,
    provenanceValid,
    freshnessValid,
    ageMs,
    checkedAt: now,
  };
}

// ── Main runner ───────────────────────────────────────────────────────────

export async function runProviderRealDataSmoke(input?: {
  includePersonalFallback?: boolean;
  baseUrl?: string;
}): Promise<ProviderReadinessReport> {
  const baseUrl = input?.baseUrl ?? "http://127.0.0.1:3000";
  const includePersonalFallback = input?.includePersonalFallback ?? false;
  const now = new Date().toISOString();

  // Task 4: validate baseUrl before doing anything
  const allowedOrigin = resolveAllowedOrigin(baseUrl);
  if (!allowedOrigin) {
    throw new Error(
      `Security: baseUrl '${baseUrl}' is not an allowed internal origin. Smoke probes only run against trusted loopback origins.`
    );
  }

  // Task 4: validate smoke key
  const smokeKey = process.env.INTERNAL_SMOKE_KEY ?? "";
  if (smokeKey.length < 32) {
    throw new Error("INTERNAL_SMOKE_KEY must be at least 32 characters. Set a random secret before running smoke tests.");
  }

  const readiness = resolveProviderReadiness();
  const readinessMap = new Map(readiness.map((r) => [r.providerId, r]));
  const smokeResults: ProviderRealDataSmokeResult[] = [];

  for (const policy of SMOKE_TARGET_POLICIES) {
    const check = readinessMap.get(policy.providerId);

    // Skip personal fallback unless explicitly included
    if (PERSONAL_FALLBACK.has(policy.providerId) && !includePersonalFallback) {
      smokeResults.push(makeSkipped(policy, "personal fallback는 명시적 flag 없이는 실행하지 않습니다.", now));
      continue;
    }

    // Not configured → skip (not a failure)
    if (!check || !check.canRunSmoke) {
      smokeResults.push(makeSkipped(policy, `provider not configured: ${check?.status ?? "unknown"}`, now));
      continue;
    }

    const result = await runSingleSmoke(policy, allowedOrigin, smokeKey, now);
    smokeResults.push(result);
  }

  const readyCount = readiness.filter((r) => r.status === "ready").length;
  const notConfiguredCount = readiness.filter(
    (r) => r.status === "not_configured" || r.status === "personal_fallback_disabled"
  ).length;
  // Task 4: failureCount counts every attempted non-pass result
  const failureCount = smokeResults.filter((r) => r.attempted && !r.passed).length;

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
