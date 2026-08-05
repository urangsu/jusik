import { describe, it, expect } from "vitest";
import {
  validateSmokeValue,
  validateSmokeProvenance,
  validateSmokeFreshness,
} from "./provider-smoke-contracts";
import type { ProviderRealDataSmokeCapability } from "../../domain/ops/provider-readiness";

// Canonical valid OHLCV candle (mirrors OhlcvSeries.candles[])
const VALID_CANDLE = {
  assetId: "KR:005930",
  market: "KR",
  timestamp: "2026-08-01T06:30:00.000Z", // ISO datetime — required
  open: 74000, high: 75500, low: 73000, close: 75000, volume: 1000000,
  source: "KIS Open API",
};

describe("validateSmokeValue — OHLCV canonical shape", () => {
  it("accepts valid OhlcvSeries with canonical candle fields", () => {
    expect(
      validateSmokeValue("ohlcv", {
        assetId: "KR:005930",
        market: "KR",
        candles: [VALID_CANDLE],
        source: "KIS Open API",
      }).success
    ).toBe(true);
  });

  it("rejects old bare {date, open, ...} shape (P0 fix)", () => {
    // The KIS provider used to return {date, open, high, low, close, volume}
    expect(
      validateSmokeValue("ohlcv", {
        candles: [{ date: "2026-08-01", open: 74000, high: 75000, low: 73000, close: 74500, volume: 100000 }],
      }).success
    ).toBe(false);
  });

  it("rejects ohlcv candle with bare date string (no time component)", () => {
    // timestamp must be a full datetime, not just YYYY-MM-DD
    expect(
      validateSmokeValue("ohlcv", {
        assetId: "KR:005930",
        market: "KR",
        candles: [{ ...VALID_CANDLE, timestamp: "2026-08-01" }],
        source: "KIS Open API",
      }).success
    ).toBe(false);
  });

  it("rejects high < low candle", () => {
    expect(
      validateSmokeValue("ohlcv", {
        assetId: "KR:005930",
        market: "KR",
        candles: [{ ...VALID_CANDLE, high: 70000, low: 75000 }], // high < low
        source: "KIS Open API",
      }).success
    ).toBe(false);
  });

  it("rejects empty candles array", () => {
    expect(
      validateSmokeValue("ohlcv", { assetId: "KR:005930", market: "KR", candles: [], source: "KIS Open API" }).success
    ).toBe(false);
  });

  it("rejects non-finite price in quote", () => {
    expect(
      validateSmokeValue("quote", {
        assetId: "KR:005930", market: "KR", symbol: "005930", price: Infinity,
        currency: "KRW", updatedAt: "2026-08-01T01:00:00.000Z", source: "KIS Open API",
      }).success
    ).toBe(false);
  });
});

describe("validateSmokeValue — financials require non-null operand", () => {
  const BASE_FINANCIALS = {
    assetId: "KR:005930",
    symbol: "005930",
    corpCode: "00126380",
    bsnsYear: "2025",
    receiptNo: "20260501001234",
    currency: "KRW" as const,
    basis: "CFS" as const,
    updatedAt: "2026-08-01T00:00:00.000Z",
  };

  it("accepts financials with non-null revenue", () => {
    expect(validateSmokeValue("financials", { ...BASE_FINANCIALS, revenue: 300_000_000_000 }).success).toBe(true);
  });

  it("rejects financials with all null operands (P1 fix)", () => {
    // All Beta operands null — this is metadata-only, not acceptable evidence
    expect(validateSmokeValue("financials", {
      ...BASE_FINANCIALS,
      revenue: null,
      operatingIncome: null,
      netIncome: null,
      assets: null,
      liabilities: null,
      equity: null,
    }).success).toBe(false);
  });

  it("rejects metadata-only financials (no operand fields at all)", () => {
    expect(validateSmokeValue("financials", BASE_FINANCIALS).success).toBe(false);
  });
});

describe("validateSmokeValue — filings", () => {
  it("accepts valid filing", () => {
    expect(
      validateSmokeValue("filings", {
        totalCount: 1,
        list: [{ rcept_no: "20260801001234", rcept_dt: "20260801", report_nm: "분기보고서" }],
      }).success
    ).toBe(true);
  });

  it("rejects empty list", () => {
    expect(validateSmokeValue("filings", { totalCount: 0, list: [] }).success).toBe(false);
  });
});

describe("validateSmokeValue — quote", () => {
  it("accepts valid quote", () => {
    expect(
      validateSmokeValue("quote", {
        assetId: "KR:005930", market: "KR", symbol: "005930", price: 75000,
        currency: "KRW", updatedAt: "2026-08-01T01:00:00.000Z", source: "KIS Open API",
      }).success
    ).toBe(true);
  });
});

describe("validateSmokeProvenance — exact match only", () => {
  it("accepts exact canonical source and tier", () => {
    expect(validateSmokeProvenance("KIS Open API", "official", "KIS Open API", "official").success).toBe(true);
  });

  it("rejects source that only contains provider name (substring)", () => {
    expect(validateSmokeProvenance("KIS Open API", "official", "attacker-not-KIS Open API", "official").success).toBe(false);
  });

  it("rejects forged-source even with correct tier", () => {
    expect(validateSmokeProvenance("KIS Open API", "official", "forged-source", "official").success).toBe(false);
  });

  it("rejects correct source with wrong tier", () => {
    expect(validateSmokeProvenance("KIS Open API", "official", "KIS Open API", "free_limited").success).toBe(false);
  });

  it("rejects null source", () => {
    expect(validateSmokeProvenance("OpenDART", "official", null, "official").success).toBe(false);
  });

  it("returns got on failure", () => {
    const result = validateSmokeProvenance("KIS Open API", "official", "wrong", "free_limited");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.got.source).toBe("wrong");
      expect(result.expected.source).toBe("KIS Open API");
    }
  });
});

describe("validateSmokeFreshness — uses dataAsOf", () => {
  const NOW = new Date("2026-08-02T09:00:00.000Z").getTime();
  const MAX_AGE_MS = 20 * 60 * 1000;

  it("returns valid=false for null dataAsOf", () => {
    expect(validateSmokeFreshness(null, MAX_AGE_MS, NOW).valid).toBe(false);
  });

  it("returns valid=false for unparseable string", () => {
    expect(validateSmokeFreshness("not-a-date", MAX_AGE_MS, NOW).valid).toBe(false);
  });

  it("returns valid=false for stale data (age exceeds max)", () => {
    const stale = new Date(NOW - MAX_AGE_MS - 1).toISOString();
    expect(validateSmokeFreshness(stale, MAX_AGE_MS, NOW).valid).toBe(false);
  });

  it("returns valid=true for recent dataAsOf", () => {
    const recent = new Date(NOW - 5 * 60 * 1000).toISOString();
    expect(validateSmokeFreshness(recent, MAX_AGE_MS, NOW).valid).toBe(true);
  });

  it("returns valid=false for future dataAsOf", () => {
    const future = new Date(NOW + 1000).toISOString();
    expect(validateSmokeFreshness(future, MAX_AGE_MS, NOW).valid).toBe(false);
  });
});
