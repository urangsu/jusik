import { describe, expect, it, vi, beforeEach } from "vitest";
import { strategySuitabilityService } from "./strategy-suitability-service";
import { regimeStore } from "../regime/regime-store";
import { signalStabilityService } from "../signals/signal-stability-service";
import { getSignalHistory } from "../signals/signal-history-store";

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
  getAssetsOfUniverse: vi.fn((universeId) => {
    if (universeId === "KOSPI_SAMPLE" || universeId === "SP500_SAMPLE") {
      return ["KR:005930", "US:AAPL"];
    }
    return null;
  }),
}));

vi.mock("../signals/signal-history-store", () => ({
  getSignalHistory: vi.fn(),
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
      universeId: "KOSPI_SAMPLE",
      date: "2026-07-05",
      consecutiveObservations: 5,
      flipCount30d: 0,
      rankAutocorrelation: 0.8,
      status: "passed",
      actionableThresholdMet: true,
      warnings: [],
    });

    // Default mock behavior for canonical StrategyAgreementSignal
    vi.mocked(getSignalHistory).mockResolvedValue([
      {
        signalHistoryId: "KR_005930_momentum_2026-07-05",
        assetId: "KR:005930",
        date: "2026-07-05",
        version: {
          signalVersionId: "agreement_v1",
          engine: { engineId: "strategy_agreement_engine", engineVersion: "1.0.0" },
          dataVersionId: "mock",
          calculatedAt: "2026-07-05T00:00:00Z"
        },
        signal: {
          signalId: "momentum",
          agreementLabel: "strong_watch",
          agreementScore: 80,
        }
      } as any
    ]);
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

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "momentum", "2026-07-05", "KOSPI_SAMPLE");
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

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "momentum", "2026-07-05", "KOSPI_SAMPLE");
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

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "momentum", "2026-07-05", "KOSPI_SAMPLE");
    expect(suitability.adjustedLabel).toBe("strong_watch");
  });

  it("vetoes to insufficient_data and nulls score when signal stability status is insufficient_data", async () => {
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
      universeId: "KOSPI_SAMPLE",
      date: "2026-07-05",
      consecutiveObservations: 1,
      flipCount30d: 1,
      rankAutocorrelation: null,
      status: "insufficient_data",
      actionableThresholdMet: false,
      warnings: ["insufficient_signal_history"],
    });

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "momentum", "2026-07-05", "KOSPI_SAMPLE");
    expect(suitability.adjustedLabel).toBe("insufficient_data");
    expect(suitability.suitabilityScore).toBeNull();
    expect(suitability.warnings.some((w) => w.includes("데이터 부족"))).toBe(true);
  });

  it("applies risk penalty and cap of 30 when signal stability status is blocked due to high flip count", async () => {
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
      universeId: "KOSPI_SAMPLE",
      date: "2026-07-05",
      consecutiveObservations: 3,
      flipCount30d: 6, // exceeds maxFlipCount
      rankAutocorrelation: 0.5,
      status: "blocked",
      actionableThresholdMet: false,
      warnings: ["signal_flip_count_high"],
    });

    const suitability = await strategySuitabilityService.calculateSuitability("KR:005930", "005930", "momentum", "2026-07-05", "KOSPI_SAMPLE");
    expect(suitability.adjustedLabel).toBe("risk");
    expect(suitability.suitabilityScore).toBe(30);
    expect(suitability.warnings.some((w) => w.includes("반전 빈도"))).toBe(true);
  });
});
