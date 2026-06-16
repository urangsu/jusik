import { describe, expect, it } from "vitest";
import { validateOhlcvCandle } from "./validate-ohlcv";
import { OhlcvCandle } from "./ohlcv";

const validCandle: OhlcvCandle = {
  assetId: "US:AAPL",
  market: "US",
  timestamp: "2026-06-16T20:00:00.000Z",
  open: 190,
  high: 195,
  low: 188,
  close: 192,
  volume: 1000000,
  source: "test",
  dataVersionId: "dv-1",
};

describe("validateOhlcvCandle", () => {
  it("accepts a valid candle", () => {
    expect(validateOhlcvCandle(validCandle)).toEqual({ valid: true, errors: [] });
  });

  it("rejects non-finite price and volume values", () => {
    const result = validateOhlcvCandle({
      ...validCandle,
      close: Number.NaN,
      volume: Number.POSITIVE_INFINITY,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(["close must be a finite number.", "volume must be a finite number."]));
  });

  it("rejects invalid OHLC relationships", () => {
    const result = validateOhlcvCandle({
      ...validCandle,
      high: 185,
      low: 196,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("high must be greater than or equal to low.");
    expect(result.errors).toContain("high must be greater than or equal to open.");
    expect(result.errors).toContain("low must be less than or equal to close.");
  });

  it("rejects invalid timestamp and market prefix mismatch", () => {
    const result = validateOhlcvCandle({
      ...validCandle,
      assetId: "KR:005930",
      timestamp: "not-a-date",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("timestamp must be a valid ISO-like datetime string.");
    expect(result.errors).toContain("assetId prefix must match market.");
  });
});
