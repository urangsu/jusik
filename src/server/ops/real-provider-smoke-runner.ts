import type { DataEnvelope, DataStatus } from "@/domain/common/data-status";
import type {
  RealProviderSmokeExpectation,
  RealProviderSmokeExpectationMode,
  RealProviderSmokeReport,
  RealProviderSmokeResult,
  RealProviderSmokeTarget,
} from "@/domain/ops/real-provider-smoke";
import type { ProviderReadinessCheck } from "@/domain/ops/provider-readiness";
import { buildEvidencePackFromDataEnvelope } from "@/server/evidence/evidence-pack-from-data-envelope";
import { validateDataEnvelopeContract } from "./data-envelope-contract-validator";
import { resolveProviderReadiness } from "./provider-readiness-resolver";
import { REAL_PROVIDER_SMOKE_TARGETS } from "./real-provider-smoke-targets";

const ENGINE_VERSION = "real-provider-smoke-v1";

type FetchLike = (input: string, init?: RequestInit) => Promise<{
  status: number;
  json: () => Promise<unknown>;
}>;

/**
 * Expected source strings for each provider that a smoke response should carry.
 * If the response source does not match any alias for the target provider,
 * it indicates a generic priority-chain response — which is a mismatch failure.
 *
 * Comparison is case-insensitive and partial (source.toLowerCase().includes(alias)).
 */
const PROVIDER_SOURCE_ALIASES: Record<string, string[]> = {
  kis: ["kis", "korea investment"],
  opendart: ["opendart", "dart"],
  fmp_free: ["fmp", "financial modeling", "financial modelling"],
  finnhub_free: ["finnhub"],
  alpha_vantage_free: ["alpha vantage", "alphavantage"],
  // system-level targets (provider_health) skip mismatch check
  system: [],
};

/**
 * Checks whether the response source field matches the expected provider.
 * Returns true when: provider has no aliases (system target), source is absent (api_required/error),
 * or source matches one of the provider's known aliases.
 */
function checkProviderSourceMatch(
  target: RealProviderSmokeTarget,
  responseSource: string | null,
  dataAvailable: boolean,
): { matched: boolean; failure: string | null } {
  // Skip mismatch check for non-market targets (provider_health etc.)
  if (target.capability === "provider_health") {
    return { matched: true, failure: null };
  }

  const aliases = PROVIDER_SOURCE_ALIASES[target.providerId];
  if (!aliases || aliases.length === 0) {
    return { matched: true, failure: null };
  }

  // If no data (api_required/error), the source field may still indicate the provider.
  // We only flag mismatch when data is available from a different provider.
  if (!dataAvailable || !responseSource) {
    return { matched: true, failure: null };
  }

  const sourceLower = responseSource.toLowerCase();
  const matched = aliases.some((alias) => sourceLower.includes(alias));
  if (!matched) {
    return {
      matched: false,
      failure: `Provider mismatch for target=${target.id}: expected source matching '${target.providerId}' (aliases: ${aliases.join(", ")}), got '${responseSource}'.`,
    };
  }

  return { matched: true, failure: null };
}

function sourceTypeFor(target: RealProviderSmokeTarget) {
  if (target.capability === "quote") return "market_quote" as const;
  if (target.capability === "ohlcv") return "ohlcv" as const;
  if (target.capability === "filings") return "opendart_filing" as const;
  if (target.capability === "provider_health") return "provider_health" as const;
  return "data_envelope" as const;
}

function claimTypeFor(target: RealProviderSmokeTarget) {
  if (target.capability === "quote") return "price" as const;
  if (target.capability === "ohlcv") return "volume" as const;
  if (target.capability === "filings" || target.capability === "financials") return "filing" as const;
  return "unknown" as const;
}

function resolveExpectationMode(
  target: RealProviderSmokeTarget,
  readiness: ProviderReadinessCheck[],
  requestedMode: RealProviderSmokeExpectationMode,
): Exclude<RealProviderSmokeExpectationMode, "auto"> {
  if (requestedMode === "with_key" || requestedMode === "without_key") {
    return requestedMode;
  }

  if (!target.requiresApiKey) {
    return "without_key";
  }

  const providerReadiness = readiness.find((check) => check.providerId === target.providerId);
  return providerReadiness?.canRunSmoke ? "with_key" : "without_key";
}

function expectedForMode(
  target: RealProviderSmokeTarget,
  mode: Exclude<RealProviderSmokeExpectationMode, "auto">,
): RealProviderSmokeExpectation {
  return mode === "with_key" ? target.expectedWithKey : target.expectedWithoutKey;
}

function evaluateExpectation(
  expectation: RealProviderSmokeExpectation,
  expectationMode: Exclude<RealProviderSmokeExpectationMode, "auto">,
  status: DataStatus | null,
  dataAvailable: boolean,
) {
  if (expectation === "api_required_allowed") {
    return status === "api_required" || dataAvailable;
  }

  if (expectation === "not_supported_allowed") {
    return status === "not_supported" || (expectationMode === "without_key" && status === "api_required") || dataAvailable;
  }

  return dataAvailable;
}

function makeFallbackEnvelope(target: RealProviderSmokeTarget, status: DataStatus, message: string): DataEnvelope<null> {
  return {
    value: null,
    status,
    source: target.providerId,
    sourceTier: target.providerId === "fmp_free" || target.providerId === "finnhub_free" || target.providerId === "alpha_vantage_free"
      ? "free_limited"
      : "manual_import",
    warnings: [],
    updatedAt: null,
    message,
  };
}

async function runTarget(
  target: RealProviderSmokeTarget,
  baseUrl: string,
  fetcher: FetchLike,
  expectationMode: Exclude<RealProviderSmokeExpectationMode, "auto">,
): Promise<RealProviderSmokeResult> {
  const checkedAt = new Date().toISOString();
  const url = `${baseUrl}${target.endpoint}`;

  let httpStatus: number | null = null;
  let raw: unknown = null;

  try {
    const internalKey = process.env.INTERNAL_SMOKE_KEY || "";
    const response = await fetcher(url, {
      method: target.method,
      headers: {
        "content-type": "application/json",
        "x-internal-smoke-key": internalKey,
      },
      body: target.method === "POST" && target.body ? JSON.stringify(target.body) : undefined,
    });
    httpStatus = response.status;
    raw = await response.json().catch(() => null);
  } catch (error) {
    raw = makeFallbackEnvelope(target, "error", error instanceof Error ? error.message : "Network error.");
  }

  const validation = validateDataEnvelopeContract(raw);
  const envelopeForEvidence = validation.status
    ? (raw as DataEnvelope<unknown>)
    : makeFallbackEnvelope(target, "error", "Response did not satisfy DataEnvelope contract.");

  // P0-1: Check that the response source matches the intended provider.
  // A generic priority-chain response from a different provider is a mismatch failure.
  const mismatch = checkProviderSourceMatch(target, validation.source, validation.dataAvailable);

  const expected = expectedForMode(target, expectationMode);
  const expectationPassed =
    httpStatus !== null &&
    httpStatus < 500 &&
    validation.passed &&
    mismatch.matched &&
    evaluateExpectation(expected, expectationMode, validation.status, validation.dataAvailable);
  const passed = validation.passed && mismatch.matched && expectationPassed;
  const failures = [
    ...validation.failures,
    ...(mismatch.failure ? [mismatch.failure] : []),
    ...(expectationPassed ? [] : [`Expectation failed for target=${target.id}.`]),
  ];

  return {
    targetId: target.id,
    providerId: target.providerId,
    capability: target.capability,
    symbol: target.symbol,
    region: target.region,
    attempted: true,
    expectationMode,
    expected,
    httpStatus,
    envelopeStatus: validation.status,
    dataAvailable: validation.dataAvailable,
    source: validation.source,
    sourceTier: validation.sourceTier,
    warnings: validation.warnings,
    updatedAt: validation.updatedAt,
    contractPassed: validation.passed,
    expectationPassed,
    passed,
    failures,
    message: envelopeForEvidence.message ?? null,
    evidencePack: buildEvidencePackFromDataEnvelope({
      envelope: envelopeForEvidence,
      subjectType: target.symbol ? "asset" : "market",
      subjectId: target.symbol ?? target.id,
      sourceType: sourceTypeFor(target),
      sourceId: `${target.providerId}:${target.capability}:${target.symbol ?? "health"}`,
      claimType: claimTypeFor(target),
      createdAt: checkedAt,
      engineVersion: ENGINE_VERSION,
    }),
    checkedAt,
  };
}

export async function runRealProviderSmoke(input?: {
  baseUrl?: string;
  targets?: RealProviderSmokeTarget[];
  fetcher?: FetchLike;
  readiness?: ProviderReadinessCheck[];
  mode?: RealProviderSmokeExpectationMode;
}): Promise<RealProviderSmokeReport> {
  const baseUrl = input?.baseUrl ?? "http://localhost:3000";
  const targets = input?.targets ?? REAL_PROVIDER_SMOKE_TARGETS;
  const fetcher = input?.fetcher ?? fetch;
  const readiness = input?.readiness ?? resolveProviderReadiness();
  const mode = input?.mode ?? "auto";
  const results: RealProviderSmokeResult[] = [];

  for (const target of targets) {
    results.push(await runTarget(target, baseUrl, fetcher, resolveExpectationMode(target, readiness, mode)));
  }

  const createdAt = new Date().toISOString();
  const failureCount = results.filter((result) => !result.passed).length;

  return {
    id: `real_provider_smoke_${Date.now()}`,
    targets,
    results,
    passed: failureCount === 0,
    failureCount,
    dataAvailableCount: results.filter((result) => result.dataAvailable).length,
    apiRequiredCount: results.filter((result) => result.envelopeStatus === "api_required").length,
    expectationMode: mode,
    createdAt,
    engineVersion: ENGINE_VERSION,
  };
}
