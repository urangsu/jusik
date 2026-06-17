import { describe, it, expect } from "vitest";
import { PriceBar } from "../prices/price-bar";
import { calculateTurtleChannel } from "./turtle-channel";

describe("Turtle Channel Breakout Calculations", () => {
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

  it("6. 터틀 채널은 window 부족 시 none을 반환한다", () => {
    const highs = Array(15).fill(110);
    const lows  = Array(15).fill(90);
    const closes = Array(15).fill(100);
    const bars = createMockBars(highs, lows, closes);

    const result = calculateTurtleChannel(bars, 10, 20, 10);
    expect(result.entryBreakout).toBe("none");
    expect(result.exitBreakout).toBe("none");
    expect(result.channelHigh).toBeNull();
    expect(result.channelLow).toBeNull();
  });

  it("calculates breakout and channel bounds correctly", () => {
    const highs  = [100, 101, 102, 103, 104, 105];
    const lows   = [90,  91,  92,  93,  94,  95];
    const closes = [95,  96,  97,  98,  99,  105];
    const bars = createMockBars(highs, lows, closes);

    const result = calculateTurtleChannel(bars, 5, 5, 3);
    expect(result.channelHigh).toBe(104);
    expect(result.channelLow).toBe(90);
    expect(result.entryBreakout).toBe("long");
    expect(result.exitBreakout).toBe("short_exit");
  });
});
