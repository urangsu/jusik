import { describe, it, expect } from "vitest";
import { PriceBar } from "@/domain/prices/price-bar";
import { calculateTechnicalSignals } from "./technical-signal-engine";

describe("Technical Signal Engine", () => {
  const createMockBars = (n: number): PriceBar[] => {
    const bars: PriceBar[] = [];
    for (let i = 0; i < n; i++) {
      bars.push({
        assetId: "US:AAPL",
        date: `2026-01-${String(i + 1).padStart(2, "0")}`,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000 + i * 100,
      });
    }
    return bars;
  };

  it("should return empty/insufficient result for short histories", () => {
    const bars = createMockBars(5);
    const result = calculateTechnicalSignals(bars, 4);

    expect(result.assetId).toBe("US:AAPL");
    expect(result.weinsteinStage).toBe("insufficient_data");
    expect(result.maSlope.ma20).toBeNull();
    expect(result.returnMomentum.return20d).toBeNull();
  });

  it("should calculate indicators successfully when history size is sufficient", () => {
    // 250 bars is enough for Weinstein (MA200) and SMA20 slope etc.
    const bars = createMockBars(250);
    const result = calculateTechnicalSignals(bars, 249);

    expect(result.assetId).toBe("US:AAPL");
    expect(result.weinsteinStage).not.toBe("insufficient_data");
    expect(result.maSlope.ma20).toBeGreaterThan(0);
    expect(result.maSlope.slope5d).not.toBeNull();
    expect(result.returnMomentum.return20d).not.toBeNull();
    expect(result.returnMomentum.return60d).not.toBeNull();
    expect(result.returnMomentum.return120d).not.toBeNull();
    expect(result.volumeZScore).not.toBeNull();
  });
});
