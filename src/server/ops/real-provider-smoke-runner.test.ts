import { describe, expect, it } from "vitest";
import { runRealProviderSmoke } from "./real-provider-smoke-runner";
import type { RealProviderSmokeTarget } from "@/domain/ops/real-provider-smoke";

const target: RealProviderSmokeTarget = {
  id: "kis_quote_kr",
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
    expect(report.apiRequiredCount).toBe(1);
    expect(report.results[0].evidencePack.blockedActions).toContain("provider_api_required");
  });

  it("passes when data is available with complete metadata", async () => {
    const report = await runRealProviderSmoke({
      targets: [target],
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
    expect(report.dataAvailableCount).toBe(1);
    expect(report.results[0].contractPassed).toBe(true);
  });

  it("fails value=null with real_time", async () => {
    const report = await runRealProviderSmoke({
      targets: [target],
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

  it("fails missing source/sourceTier/warnings metadata", async () => {
    const report = await runRealProviderSmoke({
      targets: [target],
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
