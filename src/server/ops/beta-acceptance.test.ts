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

function makeSmokeResult(
  overrides: Partial<ProviderRealDataSmokeResult> & {
    providerId: string;
    capability: string;
    symbol: string;
  }
): ProviderRealDataSmokeResult {
  return {
    region: "KR",
    attempted: true,
    skippedReason: null,
    envelopeStatus: "real_time",
    dataAvailable: true,
    source: `${overrides.providerId.toUpperCase()} Open API`,
    sourceTier: "official",
    warnings: [],
    updatedAt: "2026-08-01T00:00:00.000Z",
    message: null,
    passed: true,
    checkedAt: "2026-08-01T00:00:00.000Z",
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
      makeSmokeResult({ providerId: "kis", capability: "quote", symbol: "005930", envelopeStatus: "real_time", source: "KIS Open API" }),
      makeSmokeResult({ providerId: "kis", capability: "ohlcv", symbol: "005930", envelopeStatus: "real_time", source: "KIS Open API" }),
      makeSmokeResult({ providerId: "opendart", capability: "filings", symbol: "005930", envelopeStatus: "eod", source: "OpenDART API" }),
      makeSmokeResult({ providerId: "opendart", capability: "financials", symbol: "005930", envelopeStatus: "eod", source: "OpenDART API" }),
      makeSmokeResult({ providerId: "finnhub_free", capability: "quote", symbol: "AAPL", envelopeStatus: "real_time", source: "Finnhub API", region: "US" }),
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
  it("all required live targets with correct identity → exitCode=0", () => {
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
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.missingRequiredProviders).toContain("opendart");
  });

  it("opendart/financials not in smokeResults → exitCode=1, reason=target_not_run", () => {
    const report = makeCompletePassingReport();
    report.smokeResults = report.smokeResults.filter(
      (r) => !(r.providerId === "opendart" && r.capability === "financials")
    );
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    const v = result.violations.find((v) => v.target.capability === "financials");
    expect(v?.reason).toBe("target_not_run");
  });

  it("smoke passed but value=null → exitCode=1, reason=null_value_on_success", () => {
    const report = makeCompletePassingReport();
    const kisQuote = report.smokeResults.find(
      (r) => r.providerId === "kis" && r.capability === "quote"
    )!;
    kisQuote.dataAvailable = false;
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    const v = result.violations.find((v) => v.reason === "null_value_on_success");
    expect(v).toBeDefined();
  });

  it("wrong provider source — finnhub target answered by FMP → exitCode=1, reason=wrong_provider_source", () => {
    const report = makeCompletePassingReport();
    const finnhub = report.smokeResults.find(
      (r) => r.providerId === "finnhub_free" && r.capability === "quote"
    )!;
    finnhub.source = "FMP Open API"; // wrong provider answered
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    const v = result.violations.find((v) => v.reason === "wrong_provider_source");
    expect(v).toBeDefined();
    expect(v?.detail).toContain("finnhub");
  });

  it("stale data for live-required target → exitCode=1, reason=stale_data_not_accepted", () => {
    const report = makeCompletePassingReport();
    const kisQuote = report.smokeResults.find(
      (r) => r.providerId === "kis" && r.capability === "quote"
    )!;
    kisQuote.envelopeStatus = "stale";
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    const v = result.violations.find((v) => v.reason === "stale_data_not_accepted");
    expect(v).toBeDefined();
  });

  it("cached data for live-required target → exitCode=1, reason=cached_not_accepted", () => {
    const report = makeCompletePassingReport();
    const kisOhlcv = report.smokeResults.find(
      (r) => r.providerId === "kis" && r.capability === "ohlcv"
    )!;
    kisOhlcv.envelopeStatus = "cached";
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    const v = result.violations.find((v) => v.reason === "cached_not_accepted");
    expect(v).toBeDefined();
  });

  it("eod data is acceptable for non-live-required targets (filings, financials)", () => {
    // eod is already used in the passing report for opendart — this must still pass
    const result = evaluateBetaAcceptance(makeCompletePassingReport());
    expect(result.exitCode).toBe(0);
  });

  it("cached data for non-live-required target (filings) → exitCode=1, reason=stale_data_not_accepted", () => {
    const report = makeCompletePassingReport();
    const filings = report.smokeResults.find(
      (r) => r.providerId === "opendart" && r.capability === "filings"
    )!;
    filings.envelopeStatus = "cached"; // cached is not in EOD_STATUSES for filing targets
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
  });

  it("target_skipped → exitCode=1, reason=target_skipped", () => {
    const report = makeCompletePassingReport();
    const kisQuote = report.smokeResults.find(
      (r) => r.providerId === "kis" && r.capability === "quote"
    )!;
    kisQuote.attempted = false;
    kisQuote.skippedReason = "provider not configured";
    kisQuote.passed = true; // skip is marked passed in runner, but evaluator must reject
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    const v = result.violations.find((v) => v.reason === "target_skipped");
    expect(v).toBeDefined();
  });

  it("multiple violations are all reported", () => {
    const report = makeCompletePassingReport();
    // Break two targets simultaneously
    const kisQuote = report.smokeResults.find(
      (r) => r.providerId === "kis" && r.capability === "quote"
    )!;
    kisQuote.dataAvailable = false;
    const finnhub = report.smokeResults.find(
      (r) => r.providerId === "finnhub_free"
    )!;
    finnhub.source = "WrongProvider";
    const result = evaluateBetaAcceptance(report);
    expect(result.exitCode).toBe(1);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });
});
