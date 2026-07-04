import { beforeEach, describe, expect, it, vi } from "vitest";
import { detectSurgeCandidates } from "./surge-candidate-detector";

vi.mock("./surge-candidate-store", () => ({
  saveSurgeCandidate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../factors/ohlcv-history-loader", () => ({
  loadOhlcvHistory: vi.fn(),
}));

vi.mock("./surge-context-store", () => ({
  getSurgeContext: vi.fn().mockResolvedValue(null),
}));

import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";
import { getSurgeContext } from "./surge-context-store";

function bars(assetId: string, latestVolume: number, latestClose = 130) {
  return Array.from({ length: 21 }, (_, index) => {
    const day = index + 1;
    const close = index === 20 ? latestClose : 100 + index;
    const prevClose = index === 19 ? 119 : close;
    return {
      assetId,
      date: `2026-06-${String(day).padStart(2, "0")}`,
      open: index === 20 ? prevClose * 1.02 : close - 1,
      high: index === 20 ? latestClose * 1.02 : close + 1,
      low: index === 20 ? latestClose * 0.96 : close - 2,
      close,
      volume: index === 20 ? latestVolume : 800_000 + index * 20_000,
    };
  });
}

describe("detectSurgeCandidates v2", () => {
  beforeEach(() => {
    vi.mocked(loadOhlcvHistory).mockReset();
    vi.mocked(getSurgeContext).mockReset();
    vi.mocked(getSurgeContext).mockResolvedValue(null);
  });

  it("filters low liquidity candidates", async () => {
    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: bars("US_AAPL", 1_000, 130),
      status: "cached",
      source: "test",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: "2026-07-02T00:00:00.000Z",
    });

    const candidates = await detectSurgeCandidates({ market: "US" });
    expect(candidates).toHaveLength(0);
  });

  it("adds score breakdown and deterministic id for liquid abnormal moves", async () => {
    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: bars("US_AAPL", 10_000_000, 140),
      status: "cached",
      source: "test",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: "2026-07-02T00:00:00.000Z",
    });

    const candidates = await detectSurgeCandidates({ market: "US" });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].id).toContain("cnd_US_AAPL_");
    expect(candidates[0].metrics.tradingValue).toBeGreaterThan(20_000_000);
    expect(candidates[0].metrics.volumeZScore).not.toBeNull();
    expect(candidates[0].scoreBreakdown.liquidityScore).toBeGreaterThan(0);
    expect(candidates[0].status).toBe("new");
  });

  it("adds filing event context and sector-relative strength when context exists", async () => {
    vi.mocked(getSurgeContext).mockResolvedValue({
      assetId: "US_AAPL",
      sectorReturn20dPct: 0.02,
      hasRecentFilingEvent: true,
      filingEventIds: ["filing_1"],
      updatedAt: "2026-07-05T00:00:00.000Z",
    });
    vi.mocked(loadOhlcvHistory).mockResolvedValue({
      value: bars("US_AAPL", 10_000_000, 140),
      status: "cached",
      source: "test",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: "2026-07-05T00:00:00.000Z",
    });

    const candidates = await detectSurgeCandidates({ market: "US" });
    expect(candidates[0].reasons).toContain("filing_event");
    expect(candidates[0].sourceRefs).toContain("filing_1");
    expect(candidates[0].scoreBreakdown.filingEventScore).toBe(0.2);
    expect(candidates[0].metrics.relativeStrength).not.toBeNull();
  });
});
