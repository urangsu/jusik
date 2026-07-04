import { describe, expect, it } from "vitest";
import { evaluateProviderKeySmokeResult, runProviderKeySmoke } from "./provider-key-smoke-runner";

describe("evaluateProviderKeySmokeResult", () => {
  it("passes api_required when key is not configured", () => {
    const result = evaluateProviderKeySmokeResult({
      targetId: "kis_quote_kr_005930",
      providerId: "kis",
      capability: "quote",
      keyConfigured: false,
      status: "api_required",
      dataAvailable: false,
      message: null,
    });

    expect(result.passed).toBe(true);
  });

  it("fails api_required when key is configured", () => {
    const result = evaluateProviderKeySmokeResult({
      targetId: "kis_quote_kr_005930",
      providerId: "kis",
      capability: "quote",
      keyConfigured: true,
      status: "api_required",
      dataAvailable: false,
      message: null,
    });

    expect(result.passed).toBe(false);
  });

  it("passes real data status when key is configured and data is available", () => {
    const result = evaluateProviderKeySmokeResult({
      targetId: "fmp_quote_us_aapl",
      providerId: "fmp_free",
      capability: "quote",
      keyConfigured: true,
      status: "delayed",
      dataAvailable: true,
      message: null,
    });

    expect(result.passed).toBe(true);
  });

  it("builds a failing report when any keyed target does not return data", async () => {
    const report = await runProviderKeySmoke({
      mode: "with_key",
      probe: async (target) => ({
        targetId: target.id,
        providerId: target.providerId,
        capability: target.capability,
        keyConfigured: true,
        status: "api_required",
        dataAvailable: false,
        message: null,
      }),
    });

    expect(report.passed).toBe(false);
    expect(report.failureCount).toBe(report.results.length);
  });
});
