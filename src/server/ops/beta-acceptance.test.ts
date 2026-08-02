import { describe, it, expect } from "vitest";
import { evaluateBetaAcceptance } from "./beta-acceptance";
import { REQUIRED_BETA_POLICIES } from "./provider-smoke-target-policy";
import type {
  ProviderReadinessReport,
  ProviderRealDataSmokeResult,
  RuntimeProviderId,
  ProviderReadinessStatus,
} from "../../domain/ops/provider-readiness";

// ─────────────────────────────────────────────────────────────────────────────
// Fixture helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeReadiness(providerId: RuntimeProviderId, status: ProviderReadinessStatus = "ready") {
  return {
    providerId,
    displayName: providerId,
    requiredKeys: ["KEY"],
    configuredKeys: status === "ready" ? ["KEY"] : [],
    missingKeys: status === "ready" ? [] : ["KEY"],
    secretsExposed: false as const,
    status,
    message: null,
    canRunSmoke: status === "ready",
    checkedAt: "2026-08-02T09:00:00.000Z",
  };
}

const CHECKED_AT = "2026-08-02T09:00:00.000Z";
const DATA_AS_OF_FRESH = "2026-08-02T08:50:00.000Z"; // 10 minutes before checkedAt

function makeResult(overrides: Partial<ProviderRealDataSmokeResult> & {
  providerId: RuntimeProviderId;
  capability: "quote" | "ohlcv" | "filings" | "financials";
  symbol: string;
}): ProviderRealDataSmokeResult {
  const { providerId, capability, symbol, ...rest } = overrides;
  return {
    providerId,
    capability,
    symbol,
    region: "KR",
    attempted: true,
    skippedReason: null,
    envelopeStatus: "real_time",
    dataAvailable: true,
    source: "KIS Open API",
    sourceTier: "official",
    warnings: [],
    updatedAt: CHECKED_AT,
    dataAsOf: DATA_AS_OF_FRESH,
    message: null,
    passed: true,
    schemaValid: true,
    schemaIssues: [],
    provenanceValid: true,
    freshnessValid: true,
    ageMs: 10 * 60_000,
    checkedAt: CHECKED_AT,
    ...rest,
  };
}

/** Build a complete passing report that passes all 5 required beta targets */
function makePassingReport(): ProviderReadinessReport {
  return {
    id: "test_report",
    readiness: [
      makeReadiness("kis"),
      makeReadiness("opendart"),
      makeReadiness("finnhub_free"),
    ],
    smokeResults: [
      makeResult({ providerId: "kis", capability: "quote", symbol: "005930", envelopeStatus: "real_time", source: "KIS Open API", sourceTier: "official" }),
      makeResult({ providerId: "kis", capability: "ohlcv", symbol: "005930", envelopeStatus: "eod", source: "KIS Open API", sourceTier: "official", dataAsOf: "2026-08-01T15:30:00.000Z", ageMs: 64800000 }),
      makeResult({ providerId: "opendart", capability: "filings", symbol: "005930", envelopeStatus: "eod", source: "OpenDART", sourceTier: "official", dataAsOf: "2026-08-02T03:00:00.000Z", ageMs: 21600000 }),
      makeResult({ providerId: "opendart", capability: "financials", symbol: "005930", envelopeStatus: "eod", source: "OpenDART", sourceTier: "official", dataAsOf: "2026-08-02T03:00:00.000Z", ageMs: 21600000 }),
      makeResult({ providerId: "finnhub_free", capability: "quote", symbol: "AAPL", region: "US", envelopeStatus: "real_time", source: "Finnhub Free", sourceTier: "free_limited" }),
    ],
    readyCount: 3,
    notConfiguredCount: 0,
    failureCount: 0,
    createdAt: CHECKED_AT,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("evaluateBetaAcceptance (independent raw field verification)", () => {
  it("all five targets with correct raw fields → exitCode=0", () => {
    const result = evaluateBetaAcceptance(makePassingReport());
    expect(result.exitCode).toBe(0);
    expect(result.violations).toHaveLength(0);
    expect(result.verifiedTargets).toHaveLength(5);
  });

  // ── P0 False-PASS reproduction: all booleans true but raw status=cached ───
  it("[P0 REPRO] cached status with provenanceValid=true/freshnessValid=true → exitCode=1, status_not_allowed", () => {
    const report = makePassingReport();
    // Manipulate raw status to cached while keeping all runner booleans true
    report.smokeResults[0] = {
      ...report.smokeResults[0],
      envelopeStatus: "cached",
      provenanceValid: true,
      freshnessValid: true,
      schemaValid: true,
      passed: true, // runner says passed — evaluator must reject independently
    };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    const v = result.violations.find((v) => v.reason === "status_not_allowed");
    expect(v).toBeDefined();
    expect(v?.detail).toContain("cached");
  });

  // ── P0 False-PASS reproduction: stale status ──────────────────────────────
  it("[P0 REPRO] stale status → exitCode=1 (stale is never valid Beta evidence)", () => {
    const report = makePassingReport();
    report.smokeResults[0] = { ...report.smokeResults[0], envelopeStatus: "stale", passed: true };
    expect(evaluateBetaAcceptance(report).exitCode).toBe(1);
    expect(evaluateBetaAcceptance(report).violations.find((v) => v.reason === "status_not_allowed")).toBeDefined();
  });

  // ── P0 False-PASS reproduction: forged source ─────────────────────────────
  it("[P0 REPRO] forged source with provenanceValid=true → exitCode=1, source_mismatch", () => {
    const report = makePassingReport();
    report.smokeResults[0] = {
      ...report.smokeResults[0],
      source: "forged-source",
      provenanceValid: true, // runner says valid — evaluator must reject
      passed: true,
    };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.find((v) => v.reason === "source_mismatch")).toBeDefined();
  });

  // ── P0 False-PASS reproduction: wrong tier ────────────────────────────────
  it("[P0 REPRO] wrong tier manual_import with provenanceValid=true → exitCode=1, tier_mismatch", () => {
    const report = makePassingReport();
    report.smokeResults[0] = {
      ...report.smokeResults[0],
      sourceTier: "manual_import",
      provenanceValid: true,
      passed: true,
    };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.find((v) => v.reason === "tier_mismatch")).toBeDefined();
  });

  // ── P0 False-PASS reproduction: stale dataAsOf with freshnessValid=true ──
  it("[P0 REPRO] old dataAsOf with freshnessValid=true → exitCode=1, freshness_exceeded", () => {
    const report = makePassingReport();
    // KIS quote maxDataAgeMs = 20 minutes; set dataAsOf to 2 hours ago
    const twoHoursAgo = new Date(Date.parse(CHECKED_AT) - 2 * 60 * 60_000).toISOString();
    report.smokeResults[0] = {
      ...report.smokeResults[0],
      dataAsOf: twoHoursAgo,
      freshnessValid: true, // runner says fresh — evaluator must reject independently
      ageMs: 2 * 60 * 60_000,
      passed: true,
    };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.find((v) => v.reason === "freshness_exceeded")).toBeDefined();
  });

  // ── All five cached simultaneously ────────────────────────────────────────
  it("[P0 REPRO] all five targets cached with all booleans true → exitCode=1", () => {
    const report = makePassingReport();
    report.smokeResults = report.smokeResults.map((r) => ({
      ...r,
      envelopeStatus: "cached" as const,
      passed: true,
      provenanceValid: true,
      freshnessValid: true,
      schemaValid: true,
    }));
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.filter((v) => v.reason === "status_not_allowed")).toHaveLength(5);
  });

  // ── dataAsOf=null → data_as_of_missing ───────────────────────────────────
  it("null dataAsOf → exitCode=1, data_as_of_missing", () => {
    const report = makePassingReport();
    report.smokeResults[0] = { ...report.smokeResults[0], dataAsOf: null, freshnessValid: false };
    expect(evaluateBetaAcceptance(report).exitCode).toBe(1);
    expect(evaluateBetaAcceptance(report).violations.find((v) => v.reason === "data_as_of_missing")).toBeDefined();
  });

  it("unparseable dataAsOf → exitCode=1, data_as_of_invalid", () => {
    const report = makePassingReport();
    report.smokeResults[0] = { ...report.smokeResults[0], dataAsOf: "not-a-date" };
    expect(evaluateBetaAcceptance(report).exitCode).toBe(1);
    expect(evaluateBetaAcceptance(report).violations.find((v) => v.reason === "data_as_of_invalid")).toBeDefined();
  });

  it("future dataAsOf → exitCode=1, data_as_of_future", () => {
    const report = makePassingReport();
    const future = new Date(Date.parse(CHECKED_AT) + 60_000).toISOString();
    report.smokeResults[0] = { ...report.smokeResults[0], dataAsOf: future };
    expect(evaluateBetaAcceptance(report).exitCode).toBe(1);
    expect(evaluateBetaAcceptance(report).violations.find((v) => v.reason === "data_as_of_future")).toBeDefined();
  });

  // ── Existing required checks ───────────────────────────────────────────────

  it("no provider configured → exitCode=1, noProviderConfigured=true", () => {
    const report = makePassingReport();
    report.readiness = report.readiness.map((r) => makeReadiness(r.providerId, "not_configured"));
    report.readyCount = 0;
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.noProviderConfigured).toBe(true);
  });

  it("missing opendart → missingRequiredProviders contains opendart", () => {
    const report = makePassingReport();
    report.readiness = report.readiness.filter((r) => r.providerId !== "opendart");
    report.readyCount = 2;
    const result = evaluateBetaAcceptance(report);
    expect(result.missingRequiredProviders).toContain("opendart");
    expect(result.exitCode).toBe(1);
  });

  it("target not in smokeResults → exitCode=1, target_not_run", () => {
    const report = makePassingReport();
    report.smokeResults = report.smokeResults.filter(
      (r) => !(r.providerId === "opendart" && r.capability === "financials")
    );
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.find((v) => v.reason === "target_not_run")?.target.capability).toBe("financials");
  });

  it("skipped result → exitCode=1, target_skipped", () => {
    const report = makePassingReport();
    report.smokeResults[0] = {
      ...report.smokeResults[0],
      attempted: false,
      skippedReason: "provider not configured",
      passed: true, // runner marks skip as passed — evaluator must reject
    };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.find((v) => v.reason === "target_skipped")).toBeDefined();
  });

  it("schema_invalid → exitCode=1", () => {
    const report = makePassingReport();
    report.smokeResults[0] = {
      ...report.smokeResults[0],
      schemaValid: false,
      schemaIssues: ["price: Expected number"],
    };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.find((v) => v.reason === "schema_invalid")?.detail).toContain("price");
  });

  it("dataAvailable=false → exitCode=1, data_unavailable", () => {
    const report = makePassingReport();
    report.smokeResults[0] = { ...report.smokeResults[0], dataAvailable: false };
    expect(evaluateBetaAcceptance(report).exitCode).toBe(1);
    expect(evaluateBetaAcceptance(report).violations.find((v) => v.reason === "data_unavailable")).toBeDefined();
  });

  it("non-required attempted failure → exitCode=1, attempted_smoke_failed", () => {
    const report = makePassingReport();
    report.smokeResults.push({
      providerId: "fmp_free",
      capability: "quote",
      symbol: "AAPL",
      region: "US",
      attempted: true,
      skippedReason: null,
      envelopeStatus: "error",
      dataAvailable: false,
      source: "FMP",
      sourceTier: "free_limited",
      warnings: [],
      updatedAt: null,
      dataAsOf: null,
      message: "connection refused",
      passed: false,
      schemaValid: false,
      schemaIssues: [],
      provenanceValid: false,
      freshnessValid: false,
      ageMs: null,
      checkedAt: CHECKED_AT,
    });
    report.failureCount = 1;
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.find((v) => v.reason === "attempted_smoke_failed")).toBeDefined();
  });

  it("multiple violations are all reported", () => {
    const report = makePassingReport();
    report.smokeResults[0] = { ...report.smokeResults[0], source: "wrong-source" };
    report.smokeResults[1] = { ...report.smokeResults[1], dataAsOf: null };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });
});
