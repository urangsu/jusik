import { describe, expect, it, vi, beforeEach } from "vitest";
import { calculateReliabilityAdjustedMomentumPreview } from "./reliability-adjusted-momentum-preview";
import { getCurrentSignals } from "../../server/signals/signal-history-store";
import { getLatestReliabilitySummary } from "./reliability-store";

vi.mock("../../server/signals/signal-history-store", () => ({
  getCurrentSignals: vi.fn(),
}));

vi.mock("./reliability-store", () => ({
  getLatestReliabilitySummary: vi.fn(),
}));

describe("calculateReliabilityAdjustedMomentumPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if current signals for asset do not exist", async () => {
    vi.mocked(getCurrentSignals).mockResolvedValue(null);

    const result = await calculateReliabilityAdjustedMomentumPreview({
      universeId: "KOSPI_SAMPLE",
      assetId: "A1",
    });

    expect(result).toBeNull();
  });

  it("calculates adjusted momentum score using multipliers from latest summary", async () => {
    const mockSignals: any = {
      A1: {
        assetId: "A1",
        momentum: {
          factorValue: {
            rawValue: 10,
          },
        },
        atomicSignals: [
          { factorId: "momentum_return", score: 50 },
          { factorId: "momentum_ma_slope", score: -20 },
        ],
      },
    };

    const mockSummary: any = {
      universeId: "KOSPI_SAMPLE",
      records: [
        { signalId: "momentum_return", horizon: "1m", weightMultiplier: 1.2, sampleStatus: "usable" },
        { signalId: "momentum_ma_slope", horizon: "1m", weightMultiplier: 0.8, sampleStatus: "usable" },
      ],
      warnings: [],
    };

    vi.mocked(getCurrentSignals).mockResolvedValue(mockSignals);
    vi.mocked(getLatestReliabilitySummary).mockResolvedValue(mockSummary);

    const result = await calculateReliabilityAdjustedMomentumPreview({
      universeId: "KOSPI_SAMPLE",
      assetId: "A1",
    });

    expect(result).not.toBeNull();
    expect(result?.baseMomentumScore).toBe(10);
    expect(result?.appliedMultipliers.length).toBeGreaterThan(0);
    
    const returnMultiplier = result?.appliedMultipliers.find(m => m.signalId === "momentum_return");
    expect(returnMultiplier?.reliabilityWeightMultiplier).toBe(1.2);
    expect(returnMultiplier?.effectiveWeight).toBeCloseTo(0.20 * 1.2, 5);
  });
});
