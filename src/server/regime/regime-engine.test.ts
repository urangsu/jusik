import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { regimeEngine, DEFAULT_MACRO_INDICATORS } from "./regime-engine";
import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";
import { PriceBar } from "@/domain/prices/price-bar";

vi.mock("../factors/ohlcv-history-loader", () => ({
  loadOhlcvHistory: vi.fn(),
}));

describe("RegimeEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await regimeEngine.updateIndicators(DEFAULT_MACRO_INDICATORS);
  });

  it("should calculate trend metrics correctly and check 125D MA", async () => {
    const bars: PriceBar[] = Array.from({ length: 150 }, (_, i) => ({
      assetId: "US:SPX",
      date: `2026-01-${String(i).padStart(3, "0")}`,
      open: 100 + i,
      high: 100 + i,
      low: 100 + i,
      close: 100 + i,
      volume: 100,
    }));

    const metrics = regimeEngine.calculateTrendMetrics(bars);
    expect(metrics.latestClose).toBe(249);
    expect(metrics.positionAboveMA).toBe(true);
    expect(metrics.return20D).toBeGreaterThan(0);
  });

  it("forbids risk_on when index is below 125D MA", async () => {
    // Mock indicators to be very bullish (normally yields risk_on)
    await regimeEngine.updateIndicators({
      vix: 11.0,
      vixZScore: 0.1,
      highYieldSpread: 2.1,
      yieldCurve10Y2Y: 1.2,
      cnnFearGreed: 85,
    });

    // Mock OHLCV loader to return downward trend bars (latest close is below 125D MA)
    const mockBars: PriceBar[] = Array.from({ length: 130 }, (_, i) => {
      const close = i < 100 ? 200 : 100 - i;
      return {
        assetId: "US:SPX",
        date: `2026-01-${String(i).padStart(3, "0")}`,
        open: close,
        high: close,
        low: close,
        close: close,
        volume: 100,
      };
    });

    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: mockBars,
      status: "real_time",
      source: "Mock",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    });

    const snapshot = await regimeEngine.evaluateRegime("US");

    // The score would have been high, but index below 125D MA restricts it
    expect(snapshot.regime).not.toBe("risk_on");
    expect(snapshot.warnings).toContain("주가지수가 125일 이동평균선 아래에 있어 risk_on이 금증(selective_risk_on으로 조정)되었습니다.");
  });

  it("restricts regime to risk_off or panic during VIX spike or credit spread spike", async () => {
    // VIX spike
    await regimeEngine.updateIndicators({
      vix: 28.0,
      vixZScore: 2.5,
      highYieldSpread: 3.0,
      yieldCurve10Y2Y: 0.5,
      cnnFearGreed: 50,
    });

    // Mock nice uptrend index bars
    const mockBars: PriceBar[] = Array.from({ length: 130 }, (_, i) => ({
      assetId: "US:SPX",
      date: `2026-01-${String(i).padStart(3, "0")}`,
      open: 100 + i,
      high: 100 + i,
      low: 100 + i,
      close: 100 + i,
      volume: 100,
    }));

    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: mockBars,
      status: "real_time",
      source: "Mock",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    });

    const snapshot = await regimeEngine.evaluateRegime("US");

    // Because of VIX spike, the regime is forced to risk_off or panic
    expect(["risk_off", "panic"]).toContain(snapshot.regime);
    expect(snapshot.warnings.some(w => w.includes("급등"))).toBe(true);
  });

  it("sets creditScore to null and adds VIX proxy warning for KR market", async () => {
    // Mock nice index bars
    const mockBars: PriceBar[] = Array.from({ length: 130 }, (_, i) => ({
      assetId: "KR:KOSPI",
      date: `2026-01-${String(i).padStart(3, "0")}`,
      open: 100 + i,
      high: 100 + i,
      low: 100 + i,
      close: 100 + i,
      volume: 100,
    }));

    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: mockBars,
      status: "real_time",
      source: "Mock",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    });

    const snapshot = await regimeEngine.evaluateRegime("KR");

    expect(snapshot.components.creditScore).toBeNull();
    expect(snapshot.warnings).toContain("KR 변동성 계산에 US VIX가 대용지표로 사용되었습니다.");
  });

  it("classifies regime as overheated when score is 90 or above", async () => {
    // Extremely bullish indicators
    await regimeEngine.updateIndicators({
      vix: 11.0,
      vixZScore: 0.1,
      highYieldSpread: 2.1,
      yieldCurve10Y2Y: 1.2,
      cnnFearGreed: 95,
    });

    // Mock nice index bars in strong uptrend above 125D MA
    const mockBars: PriceBar[] = Array.from({ length: 130 }, (_, i) => ({
      assetId: "US:SPX",
      date: `2026-01-${String(i).padStart(3, "0")}`,
      open: 100 + i * 2,
      high: 100 + i * 2,
      low: 100 + i * 2,
      close: 100 + i * 2,
      volume: 100,
    }));

    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: mockBars,
      status: "real_time",
      source: "Mock",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    });

    const snapshot = await regimeEngine.evaluateRegime("US");

    expect(snapshot.score).toBeGreaterThanOrEqual(90);
    expect(snapshot.regime).toBe("overheated");
  });
});
