import { describe, expect, it } from "vitest";
import { runRealProviderSmoke } from "./real-provider-smoke-runner";
import type { RealProviderSmokeTarget } from "@/domain/ops/real-provider-smoke";
import type { ProviderReadinessCheck } from "@/domain/ops/provider-readiness";

const target: RealProviderSmokeTarget = {
  id: "kis_quote_kr_005930",
  providerId: "kis",
  capability: "quote",
  method: "GET",
  endpoint: "/api/market/quote?symbol=005930&region=KR&providerId=kis",
  symbol: "005930",
  region: "KR",
  requiresApiKey: true,
  expectedWithoutKey: "api_required_allowed",
  expectedWithKey: "data_available",
};

const fmpTarget: RealProviderSmokeTarget = {
  id: "fmp_quote_us_aapl",
  providerId: "fmp_free",
  capability: "quote",
  method: "GET",
  endpoint: "/api/market/quote?symbol=AAPL&region=US&providerId=fmp_free",
  symbol: "AAPL",
  region: "US",
  requiresApiKey: true,
  expectedWithoutKey: "not_supported_allowed",
  expectedWithKey: "data_available",
};

const notSupportedWithKeyTarget: RealProviderSmokeTarget = {
  ...target,
  id: "opendart_financials_kr_00126380",
  providerId: "opendart",
  capability: "financials",
  expectedWithoutKey: "api_required_allowed",
  expectedWithKey: "not_supported_allowed",
};

const notConfiguredReadiness: ProviderReadinessCheck[] = [
  {
    providerId: "kis",
    displayName: "KIS",
    requiredKeys: ["KIS_APP_KEY", "KIS_APP_SECRET"],
    configuredKeys: [],
    missingKeys: ["KIS_APP_KEY", "KIS_APP_SECRET"],
    secretsExposed: false,
    status: "not_configured",
    message: "missing keys",
    canRunSmoke: false,
    checkedAt: "2026-07-02T00:00:00.000Z",
  },
];

const readyReadiness: ProviderReadinessCheck[] = [
  {
    providerId: "kis",
    displayName: "KIS",
    requiredKeys: ["KIS_APP_KEY", "KIS_APP_SECRET"],
    configuredKeys: ["KIS_APP_KEY", "KIS_APP_SECRET"],
    missingKeys: [],
    secretsExposed: false,
    status: "ready",
    message: null,
    canRunSmoke: true,
    checkedAt: "2026-07-02T00:00:00.000Z",
  },
];

const fmpReadyReadiness: ProviderReadinessCheck[] = [
  {
    providerId: "fmp_free",
    displayName: "FMP",
    requiredKeys: ["FMP_API_KEY"],
    configuredKeys: ["FMP_API_KEY"],
    missingKeys: [],
    secretsExposed: false,
    status: "ready",
    message: null,
    canRunSmoke: true,
    checkedAt: "2026-07-02T00:00:00.000Z",
  },
];

const opendartReadyReadiness: ProviderReadinessCheck[] = [
  {
    providerId: "opendart",
    displayName: "OpenDART",
    requiredKeys: ["OPENDART_API_KEY"],
    configuredKeys: ["OPENDART_API_KEY"],
    missingKeys: [],
    secretsExposed: false,
    status: "ready",
    message: null,
    canRunSmoke: true,
    checkedAt: "2026-07-02T00:00:00.000Z",
  },
];

function response(status: number, body: unknown) {
  return Promise.resolve({
    status,
    json: () => Promise.resolve(body),
  });
}

describe("runRealProviderSmoke", () => {
  it("passes api_required no-key state and records EvidencePack", async () => {
    const report = await runRealProviderSmoke({
      targets: [target],
      readiness: notConfiguredReadiness,
      fetcher: () =>
        response(200, {
          value: null,
          status: "api_required",
          source: "KIS",
          sourceTier: "official",
          warnings: [],
          updatedAt: null,
          message: "API key required.",
        }),
    });

    expect(report.passed).toBe(true);
    expect(report.results[0].expectationMode).toBe("without_key");
    expect(report.results[0].expected).toBe("api_required_allowed");
    expect(report.apiRequiredCount).toBe(1);
    expect(report.results[0].evidencePack.blockedActions).toContain("provider_api_required");
  });

  it("passes when data is available with complete metadata", async () => {
    const report = await runRealProviderSmoke({
      targets: [target],
      readiness: readyReadiness,
      fetcher: () =>
        response(200, {
          value: { price: 100 },
          status: "real_time",
          source: "KIS",
          sourceTier: "official",
          warnings: [],
          updatedAt: "2026-07-02T00:00:00.000Z",
        }),
    });

    expect(report.passed).toBe(true);
    expect(report.results[0].expectationMode).toBe("with_key");
    expect(report.results[0].expected).toBe("data_available");
    expect(report.dataAvailableCount).toBe(1);
    expect(report.results[0].contractPassed).toBe(true);
  });

  it("fails value=null with real_time", async () => {
    const report = await runRealProviderSmoke({
      targets: [target],
      readiness: readyReadiness,
      fetcher: () =>
        response(200, {
          value: null,
          status: "real_time",
          source: "KIS",
          sourceTier: "official",
          warnings: [],
          updatedAt: "2026-07-02T00:00:00.000Z",
        }),
    });

    expect(report.passed).toBe(false);
    expect(report.failureCount).toBe(1);
    expect(report.results[0].failures.join(" ")).toContain("value cannot be null");
  });

  // P0-2: Key configured + api_required → must fail
  it("fails api_required when provider readiness says key-backed smoke should return data", async () => {
    const report = await runRealProviderSmoke({
      targets: [target],
      readiness: readyReadiness,
      fetcher: () =>
        response(200, {
          value: null,
          status: "api_required",
          source: "KIS",
          sourceTier: "official",
          warnings: [],
          updatedAt: null,
          message: "API key required.",
        }),
    });

    expect(report.passed).toBe(false);
    expect(report.results[0].expectationMode).toBe("with_key");
    expect(report.results[0].expected).toBe("data_available");
    expect(report.results[0].failures).toContain("Expectation failed for target=kis_quote_kr_005930.");
  });

  it("does not let with-key not_supported expectation pass on api_required", async () => {
    const report = await runRealProviderSmoke({
      targets: [notSupportedWithKeyTarget],
      readiness: opendartReadyReadiness,
      fetcher: () =>
        response(200, {
          value: null,
          status: "api_required",
          source: "OpenDART",
          sourceTier: "official",
          warnings: [],
          updatedAt: null,
          message: "API key required.",
        }),
    });

    expect(report.passed).toBe(false);
    expect(report.results[0].expectationMode).toBe("with_key");
    expect(report.results[0].expected).toBe("not_supported_allowed");
  });

  it("fails missing source/sourceTier/warnings metadata", async () => {
    const report = await runRealProviderSmoke({
      targets: [target],
      readiness: readyReadiness,
      fetcher: () =>
        response(200, {
          value: { price: 100 },
          status: "real_time",
          updatedAt: "2026-07-02T00:00:00.000Z",
        }),
    });

    expect(report.passed).toBe(false);
    expect(report.results[0].failures).toContain("source is required.");
    expect(report.results[0].failures).toContain("sourceTier is required.");
    expect(report.results[0].failures).toContain("warnings must be an array.");
  });

  // P0-1: Provider mismatch — FMP target responded with Finnhub source
  it("fails when response source does not match the target provider", async () => {
    const report = await runRealProviderSmoke({
      targets: [fmpTarget],
      readiness: fmpReadyReadiness,
      fetcher: () =>
        response(200, {
          value: { price: 150 },
          status: "delayed",
          source: "Finnhub Free",     // Wrong provider! FMP was expected.
          sourceTier: "free_limited",
          warnings: [],
          updatedAt: "2026-07-05T00:00:00.000Z",
        }),
    });

    expect(report.passed).toBe(false);
    expect(report.results[0].failures.some((f) => f.includes("Provider mismatch"))).toBe(true);
  });

  // P0-1: Provider match — FMP source matches fmp_free target
  it("passes when response source matches the target provider", async () => {
    const report = await runRealProviderSmoke({
      targets: [fmpTarget],
      readiness: fmpReadyReadiness,
      fetcher: () =>
        response(200, {
          value: { price: 150 },
          status: "delayed",
          source: "Financial Modeling Prep Free",
          sourceTier: "free_limited",
          warnings: [],
          updatedAt: "2026-07-05T00:00:00.000Z",
        }),
    });

    expect(report.passed).toBe(true);
    expect(report.results[0].failures.some((f) => f.includes("Provider mismatch"))).toBe(false);
  });
});
