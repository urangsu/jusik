import { describe, expect, it, vi, beforeEach } from "vitest";
import { strategySuitabilityService } from "./strategy-suitability-service";
import { regimeStore } from "../regime/regime-store";
import { signalStabilityService } from "../signals/signal-stability-service";

vi.mock("../regime/regime-store", () => ({
  regimeStore: {
    getLatestSnapshot: vi.fn(),
    getSnapshotAsOf: vi.fn(),
  },
}));

vi.mock("../signals/signal-stability-service", () => ({
  signalStabilityService: {
    getStability: vi.fn(),
  },
}));

const mockComponents = {
  trendScore: 50,
  volatilityScore: 50,
  creditScore: 50,
  rateScore: 50,
  fxScore: 50,
  sentimentReferenceScore: 50,
};

describe("StrategySuitabilityService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock behavior for signal stability: met/stable
    vi.mocked(signalStabilityService.getStability).mockResolvedValue({
      assetId: "KR:005930",
      signalId: "momentum",
      date: "2026-07-05",
      consecutiveObservations: 5,
      flipCount30d: 0,
      rankAutocorrelation: 0.8,
      status: "passed",
      actionableThresholdMet: true,
      warnings: [],
    });
  });

  it("blocks score and sets insufficient_data when regime is panic", async () => {
    vi.mocked(regimeStore.getSnapshotAsOf).mockResolvedValue({
      id: "regime_panic",
      regime: "panic",
      score: 10,
      components: mockComponents,
      gates: { allowsNewWatch: false, allowsRiskUpgrading: false, suppressesMomentumAlert: true },
      confidence: "high",
      missingInputs: [],
      warnings: ["Crash"],
      market: "KR",
      source: "test",
      sourceTier: "official",
      dataStatus: "real_time",
      updatedAt: "2026-07-05T00:00:00Z",
      calculatedAt: "2026-07-05T00:00:00Z",
      engineVersion: "1.0.0",
    });

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "momentum", "strong_watch", 85, "2026-07-05");
    expect(suitability.suitabilityScore).toBeNull();
    expect(suitability.adjustedLabel).toBe("insufficient_data");
    expect(suitability.warnings.some((w) => w.includes("패닉"))).toBe(true);
  });

  it("downgrades watch labels to caution when regime is risk_off", async () => {
    vi.mocked(regimeStore.getSnapshotAsOf).mockResolvedValue({
      id: "regime_risk_off",
      regime: "risk_off",
      score: 30,
      components: mockComponents,
      gates: { allowsNewWatch: false, allowsRiskUpgrading: false, suppressesMomentumAlert: true },
      confidence: "high",
      missingInputs: [],
      warnings: ["Correction"],
      market: "KR",
      source: "test",
      sourceTier: "official",
      dataStatus: "real_time",
      updatedAt: "2026-07-05T00:00:00Z",
      calculatedAt: "2026-07-05T00:00:00Z",
      engineVersion: "1.0.0",
    });

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "momentum", "strong_watch", 80, "2026-07-05");
    expect(suitability.adjustedLabel).toBe("caution");
    expect(suitability.suitabilityScore).toBe(80); // score itself is maintained but label downgraded
  });

  it("retains original label when regime is neutral or risk_on", async () => {
    vi.mocked(regimeStore.getSnapshotAsOf).mockResolvedValue({
      id: "regime_neutral",
      regime: "neutral",
      score: 50,
      components: mockComponents,
      gates: { allowsNewWatch: true, allowsRiskUpgrading: true, suppressesMomentumAlert: false },
      confidence: "high",
      missingInputs: [],
      warnings: [],
      market: "KR",
      source: "test",
      sourceTier: "official",
      dataStatus: "real_time",
      updatedAt: "2026-07-05T00:00:00Z",
      calculatedAt: "2026-07-05T00:00:00Z",
      engineVersion: "1.0.0",
    });

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "momentum", "strong_watch", 85, "2026-07-05");
    expect(suitability.adjustedLabel).toBe("strong_watch");
  });

  it("vetoes to insufficient_data and nulls score when signal stability is not met", async () => {
    vi.mocked(regimeStore.getSnapshotAsOf).mockResolvedValue({
      id: "regime_neutral",
      regime: "neutral",
      score: 50,
      components: mockComponents,
      gates: { allowsNewWatch: true, allowsRiskUpgrading: true, suppressesMomentumAlert: false },
      confidence: "high",
      missingInputs: [],
      warnings: [],
      market: "KR",
      source: "test",
      sourceTier: "official",
      dataStatus: "real_time",
      updatedAt: "2026-07-05T00:00:00Z",
      calculatedAt: "2026-07-05T00:00:00Z",
      engineVersion: "1.0.0",
    });

    vi.mocked(signalStabilityService.getStability).mockResolvedValue({
      assetId: "KR:005930",
      signalId: "momentum",
      date: "2026-07-05",
      consecutiveObservations: 1,
      flipCount30d: 5,
      rankAutocorrelation: 0.1,
      status: "blocked",
      actionableThresholdMet: false,
      warnings: ["signal_not_persistent", "signal_flip_count_high"],
    });

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "momentum", "strong_watch", 85, "2026-07-05");
    expect(suitability.adjustedLabel).toBe("insufficient_data");
    expect(suitability.suitabilityScore).toBeNull();
    expect(suitability.warnings.some((w) => w.includes("불안정성"))).toBe(true);
  });
});
