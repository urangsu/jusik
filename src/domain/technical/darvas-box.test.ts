import { describe, it, expect } from "vitest";
import { PriceBar } from "../prices/price-bar";
import { calculateDarvasBox } from "./darvas-box";

describe("Darvas Box Calculations", () => {
  const createMockBars = (highs: number[], lows: number[], closes: number[]): PriceBar[] => {
    return highs.map((high, i) => ({
      assetId: "A",
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 100,
      high,
      low: lows[i],
      close: closes[i],
      volume: 1000,
    }));
  };

  it("5. 다윈 박스는 충분한 기간 전에는 breakout을 만들지 않는다", () => {
    const highs = [100, 105, 100, 99];
    const lows  = [95,  94,  96,  97];
    const closes = [98,  100, 97,  98];
    const bars = createMockBars(highs, lows, closes);

    const result = calculateDarvasBox(bars, 3, 3);
    expect(result.upperBound).toBeNull();
    expect(result.lowerBound).toBeNull();
    expect(result.breakout).toBe("none");
    expect(result.boxAge).toBeNull();
  });

  it("forms box and detects breakout correctly", () => {
    const highs  = [100, 105, 102, 101, 100, 100, 100, 100, 106];
    const lows   = [95,  96,  95,  97,  96,  96,  97,  98,  99];
    const closes = [98,  100, 97,  98,  98,  98,  98,  98,  106];
    const bars = createMockBars(highs, lows, closes);

    const formedResult = calculateDarvasBox(bars, 7, 3);
    expect(formedResult.upperBound).toBe(105);
    expect(formedResult.lowerBound).toBe(96);
    expect(formedResult.breakout).toBe("none");

    const breakoutResult = calculateDarvasBox(bars, 8, 3);
    expect(breakoutResult.breakout).toBe("up");
    expect(breakoutResult.upperBound).toBe(105);
  });
});
