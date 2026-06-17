import { describe, it, expect } from "vitest";
import { PriceBar } from "../prices/price-bar";
import { calculateWeinsteinStage } from "./weinstein-stage";

describe("Weinstein Stage Calculations", () => {
  const createMockBars = (closes: number[]): PriceBar[] => {
    return closes.map((close, i) => ({
      assetId: "A",
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: 100,
      high: close + 5,
      low: close - 5,
      close,
      volume: 1000,
    }));
  };

  it("7. 와인스타인 스테이지는 MA200 부족 시 insufficient_data를 반환한다", () => {
    const bars = createMockBars(Array(100).fill(100));
    const result = calculateWeinsteinStage(bars, 90, 200, 5);
    expect(result).toBe("insufficient_data");
  });

  it("classifies stage 2 uptrend when price is above rising MA200", () => {
    const closes = Array.from({ length: 210 }, (_, i) => 100 + i * 0.5);
    const bars = createMockBars(closes);
    const result = calculateWeinsteinStage(bars, 209, 200, 5);
    expect(result).toBe("stage_2_uptrend");
  });

  it("classifies stage 4 downtrend when price is below falling MA200", () => {
    const closes = Array.from({ length: 210 }, (_, i) => 200 - i * 0.5);
    const bars = createMockBars(closes);
    const result = calculateWeinsteinStage(bars, 209, 200, 5);
    expect(result).toBe("stage_4_downtrend");
  });
});
