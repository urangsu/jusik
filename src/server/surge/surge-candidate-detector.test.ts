import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectSurgeCandidates } from "./surge-candidate-detector";
import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";

vi.mock("../factors/ohlcv-history-loader", () => ({
  loadOhlcvHistory: vi.fn(),
}));

vi.mock("./surge-candidate-store", () => ({
  saveSurgeCandidate: vi.fn().mockResolvedValue(undefined),
}));

describe("surge-candidate-detector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects candidates with price changes (>5%)", async () => {
    const mockBars = [
      { assetId: "US_AAPL", date: "2026-06-01", open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { assetId: "US_AAPL", date: "2026-06-02", open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { assetId: "US_AAPL", date: "2026-06-03", open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { assetId: "US_AAPL", date: "2026-06-04", open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { assetId: "US_AAPL", date: "2026-06-05", open: 100, high: 100, low: 100, close: 100, volume: 100 },
      { assetId: "US_AAPL", date: "2026-06-06", open: 100, high: 100, low: 100, close: 100, volume: 100 },
      // latest bar price surges by 6% (106)
      { assetId: "US_AAPL", date: "2026-06-07", open: 100, high: 107, low: 99, close: 106, volume: 100 },
    ];

    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: mockBars,
      status: "cached",
      source: "Mock",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    });

    const candidates = await detectSurgeCandidates({ market: "US" });
    // AAPL or MSFT should trigger since we stubbed it for the whole US universe list in detector
    expect(candidates.length).toBeGreaterThan(0);
    const candidate = candidates[0];
    expect(candidate.reasons).toContain("price_change");
    expect(candidate.metrics.priceChangePct).toBeCloseTo(0.06);
  });

  it("detects candidates with volume spikes (>3x average)", async () => {
    const mockBars = [
      { assetId: "US_AAPL", date: "2026-06-01", open: 100, high: 100, low: 100, close: 100, volume: 10 },
      { assetId: "US_AAPL", date: "2026-06-02", open: 100, high: 100, low: 100, close: 100, volume: 10 },
      { assetId: "US_AAPL", date: "2026-06-03", open: 100, high: 100, low: 100, close: 100, volume: 10 },
      { assetId: "US_AAPL", date: "2026-06-04", open: 100, high: 100, low: 100, close: 100, volume: 10 },
      { assetId: "US_AAPL", date: "2026-06-05", open: 100, high: 100, low: 100, close: 100, volume: 10 },
      { assetId: "US_AAPL", date: "2026-06-06", open: 100, high: 100, low: 100, close: 100, volume: 10 },
      // latest bar volume spikes to 50 (>3x of previous average which was 10)
      { assetId: "US_AAPL", date: "2026-06-07", open: 100, high: 100, low: 100, close: 100, volume: 50 },
    ];

    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: mockBars,
      status: "cached",
      source: "Mock",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    });

    const candidates = await detectSurgeCandidates({ market: "US" });
    expect(candidates.length).toBeGreaterThan(0);
    const candidate = candidates.find((c) => c.reasons.includes("volume_spike"));
    expect(candidate).toBeDefined();
    expect(candidate!.metrics.volumeRatio).toBe(5.0);
  });
});
