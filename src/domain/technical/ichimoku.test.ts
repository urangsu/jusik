import { describe, it, expect } from "vitest";
import { PriceBar } from "../prices/price-bar";
import { calculateIchimoku, getCloudPosition, detectTKCross } from "./ichimoku";

describe("Ichimoku Cloud Calculations", () => {
  const createMockBars = (length: number, defaultClose = 100): PriceBar[] => {
    return Array.from({ length }, (_, i) => ({
      assetId: "A",
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      open: defaultClose,
      high: defaultClose + 10,
      low: defaultClose - 10,
      close: defaultClose,
      volume: 1000,
    }));
  };

  it("4. 일목균형표는 데이터 부족 시 null을 반환한다", () => {
    const bars = createMockBars(10);
    const result = calculateIchimoku(bars, 5);
    expect(result.tenkanSen).toBeNull();
    expect(result.kijunSen).toBeNull();
    expect(result.senkouSpanA).toBeNull();
    expect(result.senkouSpanB).toBeNull();
    expect(result.chikouSpan).toBeNull();
  });

  it("calculates Tenkan-sen and Kijun-sen when enough data is available", () => {
    const bars = createMockBars(30);
    const result = calculateIchimoku(bars, 26);
    expect(result.tenkanSen).toBe(100);
    expect(result.kijunSen).toBe(100);
  });

  it("detects price relative to cloud correctly", () => {
    expect(getCloudPosition(120, 100, 110)).toBe("above");
    expect(getCloudPosition(90, 100, 110)).toBe("below");
    expect(getCloudPosition(105, 100, 110)).toBe("inside");
    expect(getCloudPosition(105, null, 110)).toBe("insufficient_data");
  });

  it("detects TK cross correctly", () => {
    expect(detectTKCross(10, 9, 9, 10)).toBe("bullish_cross");
    expect(detectTKCross(9, 10, 10, 9)).toBe("bearish_cross");
    expect(detectTKCross(10, 10, 9, 9)).toBe("none");
  });
});
