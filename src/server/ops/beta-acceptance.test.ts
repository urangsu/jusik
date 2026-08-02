import { describe, it, expect } from "vitest";
import { evaluateBetaAcceptance, REQUIRED_BETA_TARGETS, type BetaAcceptanceTarget } from "./beta-acceptance";
import type { ProviderReadinessReport, ProviderRealDataSmokeResult, RuntimeProviderId, ProviderReadinessStatus } from "../../domain/ops/provider-readiness";

// ─────────────────────────────────────────────────────────────────────────────
// Fixture builders
// ─────────────────────────────────────────────────────────────────────────────

function makeReadinessCheck(providerId: RuntimeProviderId, status: ProviderReadinessStatus = "ready") {
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
    checkedAt: "2026-08-01T00:00:00.000Z",
  };
}

const BASE_SMOKE_FIELDS = {
  attempted: true,
  skippedReason: null,
  warnings: [],
  message: null,
  passed: true,
  schemaValid: true,
  schemaIssues: [] as string[],
  provenanceValid: true,
  freshnessValid: true,
  ageMs: 5 * 60 * 1000,
} as const;

function makeSmoke(
  overrides: { providerId: RuntimeProviderId; capability: string; symbol: string } & Partial<ProviderRealDataSmokeResult>
): ProviderRealDataSmokeResult {
  return {
    region: "KR",
    envelopeStatus: "real_time",
    dataAvailable: true,
    source: `${overrides.providerId} source`,
    sourceTier: "official",
    updatedAt: "2026-08-01T00:00:00.000Z",
    checkedAt: "2026-08-01T00:00:00.000Z",
    ...BASE_SMOKE_FIELDS,
    ...(overrides as any),
  };
}

/** Build a complete passing report covering all REQUIRED_BETA_TARGETS */
function makeCompletePassingReport(): ProviderReadinessReport {
  return {
    id: "test_report",
    readiness: [
      makeReadinessCheck("kis"),
      makeReadinessCheck("opendart"),
      makeReadinessCheck("finnhub_free"),
    ],
    smokeResults: [
      makeSmoke({ providerId: "kis", capability: "quote", symbol: "005930", envelopeStatus: "real_time", source: "KIS Open API", sourceTier: "official", region: "KR" }),
      makeSmoke({ providerId: "kis", capability: "ohlcv", symbol: "005930", envelopeStatus: "eod", source: "KIS Open API", sourceTier: "official", region: "KR" }),
      makeSmoke({ providerId: "opendart", capability: "filings", symbol: "005930", envelopeStatus: "eod", source: "OpenDART", sourceTier: "official", region: "KR" }),
      makeSmoke({ providerId: "opendart", capability: "financials", symbol: "005930", envelopeStatus: "eod", source: "OpenDART", sourceTier: "official", region: "KR" }),
      makeSmoke({ providerId: "finnhub_free", capability: "quote", symbol: "AAPL", envelopeStatus: "real_time", source: "Finnhub Free", sourceTier: "free_limited", region: "US" }),
    ],
    readyCount: 3,
    notConfiguredCount: 0,
    failureCount: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("evaluateBetaAcceptance (pure function)", () => {
  it("all required live targets with exact provenance → exitCode=0", () => {
    const result = evaluateBetaAcceptance(makeCompletePassingReport());
    expect(result.exitCode).toBe(0);
    expect(result.violations).toHaveLength(0);
    expect(result.verifiedTargets).toHaveLength(REQUIRED_BETA_TARGETS.length);
  });

  it("no provider configured → exitCode=1, noProviderConfigured=true", () => {
    const report: ProviderReadinessReport = {
      id: "test",
      readiness: [makeReadinessCheck("kis", "not_configured")],
      smokeResults: [],
      readyCount: 0,
      notConfiguredCount: 1,
      failureCount: 0,
      createdAt: "2026-08-01T00:00:00.000Z",
    };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.noProviderConfigured).toBe(true);
  });

  it("partial provider set — opendart missing → exitCode=1, missingRequiredProviders=[opendart]", () => {
    const report = makeCompletePassingReport();
    report.readiness = report.readiness.filter((r) => r.providerId !== "opendart");
    expect(evaluateBetaAcceptance(report).missingRequiredProviders).toContain("opendart");
    expect(evaluateBetaAcceptance(report).exitCode).toBe(1);
  });

  it("opendart/financials not in smokeResults → exitCode=1, reason=target_not_run", () => {
    const report = makeCompletePassingReport();
    report.smokeResults = report.smokeResults.filter(
      (r) => !(r.providerId === "opendart" && r.capability === "financials")
    );
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    const v = result.violations.find((v) => v.reason === "target_not_run");
    expect(v?.target.capability).toBe("financials");
  });

  it("smoke passed but value=null → exitCode=1, reason=null_value_on_success", () => {
    const report = makeCompletePassingReport();
    report.smokeResults[0] = { ...report.smokeResults[0], dataAvailable: false };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.find((v) => v.reason === "null_value_on_success")).toBeDefined();
  });

  // ── Task 5 Step 1: new fixture tests ─────────────────────────────────────

  it.each([
    ["schema invalid", { schemaValid: false, schemaIssues: ["price: Expected number"] }],
    ["provenance invalid", { provenanceValid: false }],
    ["freshness invalid", { freshnessValid: false }],
    ["missing updatedAt", { updatedAt: null, freshnessValid: false }],
  ] as [string, Partial<ProviderRealDataSmokeResult>][])("fails closed when %s", (_name, patch) => {
    const report = makeCompletePassingReport();
    report.smokeResults[0] = { ...report.smokeResults[0], ...patch };
    expect(evaluateBetaAcceptance(report).exitCode).toBe(1);
  });

  it("schema_invalid violation has correct reason", () => {
    const report = makeCompletePassingReport();
    report.smokeResults[0] = {
      ...report.smokeResults[0],
      schemaValid: false,
      schemaIssues: ["price: Expected number, received string"],
    };
    const result = evaluateBetaAcceptance(report);
    const v = result.violations.find((v) => v.reason === "schema_invalid");
    expect(v).toBeDefined();
    expect(v?.detail).toContain("price");
  });

  it("provenance_invalid violation when source doesn't exactly match (substring)", () => {
    const report = makeCompletePassingReport();
    // Simulate wrong source that contains provider name substring
    report.smokeResults[0] = {
      ...report.smokeResults[0],
      provenanceValid: false,
    };
    const result = evaluateBetaAcceptance(report);
    expect(result.violations.find((v) => v.reason === "provenance_invalid")).toBeDefined();
  });

  it("fails when an attempted configured provider smoke fails (attempted_smoke_failed)", () => {
    const report = makeCompletePassingReport();
    // Add an extra attempted failing result after required targets all pass
    report.smokeResults.push({
      providerId: "fmp_free",
      capability: "quote",
      symbol: "AAPL",
      region: "US",
      attempted: true,
      skippedReason: null,
      envelopeStatus: "error",
      dataAvailable: false,
      source: "FMP Free",
      sourceTier: "free_limited",
      warnings: [],
      updatedAt: null,
      message: "provider request failed",
      passed: false,
      schemaValid: false,
      schemaIssues: ["value is null"],
      provenanceValid: true,
      freshnessValid: false,
      ageMs: null,
      checkedAt: "2026-08-01T00:00:00.000Z",
    });
    report.failureCount = 1;
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.find((v) => v.reason === "attempted_smoke_failed")).toBeDefined();
  });

  it("target_skipped → exitCode=1, reason=target_skipped", () => {
    const report = makeCompletePassingReport();
    report.smokeResults[0] = {
      ...report.smokeResults[0],
      attempted: false,
      skippedReason: "provider not configured",
      passed: true, // runner marks skip as passed, evaluator must still reject
    };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.find((v) => v.reason === "target_skipped")).toBeDefined();
  });

  it("multiple violations are all reported", () => {
    const report = makeCompletePassingReport();
    report.smokeResults[0] = { ...report.smokeResults[0], dataAvailable: false };
    report.smokeResults[1] = { ...report.smokeResults[1], schemaValid: false, schemaIssues: ["candles: too short"] };
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });
});
