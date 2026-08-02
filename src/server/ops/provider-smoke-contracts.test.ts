import { describe, it, expect } from "vitest";
import {
  validateSmokeValue,
  validateSmokeProvenance,
  validateSmokeFreshness,
  PROVIDER_PROVENANCE,
} from "./provider-smoke-contracts";
import type { ProviderRealDataSmokeCapability } from "../../domain/ops/provider-readiness";

// ── Task 3 Step 1 — failing tests before implementation ───────────────────

describe("validateSmokeValue", () => {
  it.each([
    ["quote", {}],
    ["quote", "75000"],
    ["quote", { price: "75000garbage", symbol: "005930", assetId: "KR:005930", currency: "KRW", updatedAt: "2026-08-01T01:00:00Z", source: "KIS" }],
    ["ohlcv", { candles: [] }],
    ["ohlcv", { candles: "not-an-array" }],
    ["filings", { list: "not-an-array" }],
    ["filings", { totalCount: 1, list: [] }],
    ["financials", { symbol: "005930" }],
    ["financials", { assetId: "KR:005930", symbol: "005930", corpCode: "1234567", bsnsYear: "2025", receiptNo: "001", currency: "KRW", basis: "CFS", updatedAt: "2026-08-01T00:00:00Z" }], // corpCode wrong length
  ] as const)("rejects invalid %s value", (capability, value) => {
    expect(
      validateSmokeValue(capability as Exclude<ProviderRealDataSmokeCapability, "news">, value).success
    ).toBe(false);
  });

  it("accepts a valid quote value", () => {
    expect(
      validateSmokeValue("quote", {
        assetId: "KR:005930",
        symbol: "005930",
        price: 75000,
        currency: "KRW",
        updatedAt: "2026-08-01T01:00:00.000Z",
        source: "KIS Open API",
      }).success
    ).toBe(true);
  });

  it("accepts a valid ohlcv value", () => {
    expect(
      validateSmokeValue("ohlcv", {
        assetId: "KR:005930",
        candles: [{
          timestamp: "2026-08-01T00:00:00.000Z",
          open: 74000, high: 75500, low: 73000, close: 75000, volume: 1000000,
        }],
      }).success
    ).toBe(true);
  });

  it("accepts a valid filings value", () => {
    expect(
      validateSmokeValue("filings", {
        totalCount: 1,
        list: [{ rcept_no: "20260801001234", rcept_dt: "20260801", report_nm: "분기보고서" }],
      }).success
    ).toBe(true);
  });

  it("accepts a valid financials value", () => {
    expect(
      validateSmokeValue("financials", {
        assetId: "KR:005930",
        symbol: "005930",
        corpCode: "00126380",
        bsnsYear: "2025",
        receiptNo: "20260501001234",
        currency: "KRW",
        basis: "CFS",
        updatedAt: "2026-08-01T00:00:00.000Z",
      }).success
    ).toBe(true);
  });

  it("rejects non-finite price", () => {
    expect(
      validateSmokeValue("quote", {
        assetId: "KR:005930", symbol: "005930", price: Infinity,
        currency: "KRW", updatedAt: "2026-08-01T00:00:00.000Z", source: "KIS",
      }).success
    ).toBe(false);
  });
});

describe("validateSmokeProvenance", () => {
  it("rejects source text that merely contains the provider name", () => {
    expect(validateSmokeProvenance("kis", "attacker-not-kis", "official").success).toBe(false);
  });

  it("rejects correct source but wrong tier", () => {
    expect(validateSmokeProvenance("kis", "KIS Open API", "free_limited").success).toBe(false);
  });

  it("rejects null source", () => {
    expect(validateSmokeProvenance("opendart", null, "official").success).toBe(false);
  });

  it("rejects source with just the word 'opendart'", () => {
    expect(validateSmokeProvenance("opendart", "opendart", "official").success).toBe(false);
  });

  it("accepts exact canonical source for KIS", () => {
    const p = PROVIDER_PROVENANCE.kis;
    expect(validateSmokeProvenance("kis", p.source, p.sourceTier).success).toBe(true);
  });

  it("accepts exact canonical source for OpenDART", () => {
    const p = PROVIDER_PROVENANCE.opendart;
    expect(validateSmokeProvenance("opendart", p.source, p.sourceTier).success).toBe(true);
  });

  it("accepts exact canonical source for Finnhub", () => {
    const p = PROVIDER_PROVENANCE.finnhub_free;
    expect(validateSmokeProvenance("finnhub_free", p.source, p.sourceTier).success).toBe(true);
  });

  it("returns expected and got on failure", () => {
    const result = validateSmokeProvenance("kis", "wrong source", "official");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.expected.source).toBe("KIS Open API");
      expect(result.got.source).toBe("wrong source");
    }
  });
});

describe("validateSmokeFreshness", () => {
  const NOW = new Date("2026-08-01T09:00:00.000Z").getTime();
  const MAX_AGE_MS = 20 * 60 * 1000; // 20 minutes

  it("returns valid=false for null updatedAt", () => {
    expect(validateSmokeFreshness(null, MAX_AGE_MS, NOW).valid).toBe(false);
    expect(validateSmokeFreshness(null, MAX_AGE_MS, NOW).ageMs).toBeNull();
  });

  it("returns valid=false for unparseable timestamp", () => {
    expect(validateSmokeFreshness("not-a-date", MAX_AGE_MS, NOW).valid).toBe(false);
  });

  it("returns valid=false for timestamp older than maxAgeMs", () => {
    const old = new Date(NOW - MAX_AGE_MS - 1).toISOString();
    const result = validateSmokeFreshness(old, MAX_AGE_MS, NOW);
    expect(result.valid).toBe(false);
    expect(result.ageMs).toBeGreaterThan(MAX_AGE_MS);
  });

  it("returns valid=true for recent timestamp", () => {
    const recent = new Date(NOW - 5 * 60 * 1000).toISOString();
    const result = validateSmokeFreshness(recent, MAX_AGE_MS, NOW);
    expect(result.valid).toBe(true);
    expect(result.ageMs).toBeCloseTo(5 * 60 * 1000, -3);
  });

  it("returns valid=false for future timestamp", () => {
    const future = new Date(NOW + 1000).toISOString();
    expect(validateSmokeFreshness(future, MAX_AGE_MS, NOW).valid).toBe(false);
  });
});
