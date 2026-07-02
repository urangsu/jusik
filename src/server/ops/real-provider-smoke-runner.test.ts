import { describe, expect, it } from "vitest";
import { runRealProviderSmoke } from "./real-provider-smoke-runner";
import type { RealProviderSmokeTarget } from "@/domain/ops/real-provider-smoke";
import type { ProviderReadinessCheck } from "@/domain/ops/provider-readiness";

const target: RealProviderSmokeTarget = {
  id: "kis_quote_kr_005930",
  providerId: "kis",
  capability: "quote",
  method: "GET",
  endpoint: "/api/market/quote?symbol=005930&region=KR",
  symbol: "005930",
  region: "KR",
  requiresApiKey: true,
  expectedWithoutKey: "api_required_allowed",
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
});
