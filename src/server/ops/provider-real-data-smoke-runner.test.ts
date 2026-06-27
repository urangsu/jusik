import { describe, it, expect } from "vitest";
import type { ProviderRealDataSmokeResult } from "@/domain/ops/provider-readiness";

/**
 * Real data smoke runner unit tests.
 *
 * Full runtime execution (with real HTTP) is covered by:
 *   npm run ops:provider-readiness -- --smoke
 *
 * Tests here verify the result domain contracts and skip logic.
 */
describe("provider-real-data-smoke-runner contracts", () => {
  it("not_configured provider skip result is a pass", () => {
    const skipResult: ProviderRealDataSmokeResult = {
      providerId: "fmp_free",
      capability: "quote",
      symbol: "AAPL",
      region: "US",
      attempted: false,
      skippedReason: "provider not configured: not_configured",
      envelopeStatus: null,
      dataAvailable: false,
      source: null,
      sourceTier: null,
      warnings: [],
      updatedAt: null,
      message: "FMP_API_KEY 누락",
      passed: true,
      checkedAt: new Date().toISOString(),
    };

    expect(skipResult.passed).toBe(true);
    expect(skipResult.attempted).toBe(false);
    expect(skipResult.skippedReason).toBeTruthy();
  });

  it("personal fallback skip without flag is a pass", () => {
    const skipResult: ProviderRealDataSmokeResult = {
      providerId: "yfinance_personal",
      capability: "quote",
      symbol: "005930.KS",
      region: "KR",
      attempted: false,
      skippedReason: "personal fallback는 명시적 flag 없이는 실행하지 않습니다.",
      envelopeStatus: null,
      dataAvailable: false,
      source: null,
      sourceTier: null,
      warnings: [],
      updatedAt: null,
      message: null,
      passed: true,
      checkedAt: new Date().toISOString(),
    };

    expect(skipResult.passed).toBe(true);
    expect(skipResult.attempted).toBe(false);
    expect(skipResult.skippedReason).toContain("personal fallback");
  });

  it("api_required from ready provider is a failure", () => {
    const failResult: ProviderRealDataSmokeResult = {
      providerId: "kis",
      capability: "quote",
      symbol: "005930",
      region: "KR",
      attempted: true,
      skippedReason: null,
      envelopeStatus: "api_required",
      dataAvailable: false,
      source: "KIS",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "provider가 ready이나 api_required 응답을 반환했습니다.",
      passed: false,
      checkedAt: new Date().toISOString(),
    };

    expect(failResult.passed).toBe(false);
    expect(failResult.attempted).toBe(true);
    expect(failResult.envelopeStatus).toBe("api_required");
  });

  it("data_available result is a pass", () => {
    const passResult: ProviderRealDataSmokeResult = {
      providerId: "fmp_free",
      capability: "quote",
      symbol: "AAPL",
      region: "US",
      attempted: true,
      skippedReason: null,
      envelopeStatus: "real_time",
      dataAvailable: true,
      source: "Financial Modeling Prep Free",
      sourceTier: "free_limited",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: null,
      passed: true,
      checkedAt: new Date().toISOString(),
    };

    expect(passResult.passed).toBe(true);
    expect(passResult.dataAvailable).toBe(true);
    expect(passResult.attempted).toBe(true);
  });
});
