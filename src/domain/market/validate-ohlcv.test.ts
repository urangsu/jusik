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
    expect(result.errors).toContain("timestamp must be a strict ISO date or datetime string.");
    expect(result.errors).toContain("assetId prefix must match market.");
  });

  it("5.1: accepts valid strict ISO timestamps", () => {
    const allowed = [
      "2026-06-07",
      "2026-06-07T00:00:00Z",
      "2026-06-07T00:00:00.000Z",
      "2026-06-07T09:30:00+09:00",
      "2026-06-07T09:30:00-04:00",
    ];
    for (const ts of allowed) {
      const res = validateOhlcvCandle({ ...validCandle, timestamp: ts });
      expect(res.valid).toBe(true);
      expect(res.errors).toEqual([]);
    }
  });

  it("5.2: rejects invalid and non-strict ISO timestamps", () => {
    const blocked = [
      "06/07/2026",
      "1",
      "2026-02-30",
      "2026-13-01",
      "2026-06-07 09:30:00",
      "2026/06/07",
      "20260607",
    ];
    for (const ts of blocked) {
      const res = validateOhlcvCandle({ ...validCandle, timestamp: ts });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain("timestamp must be a strict ISO date or datetime string.");
    }
  });
});
