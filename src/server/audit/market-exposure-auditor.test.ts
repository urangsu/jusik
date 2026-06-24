import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockGetStrategyTrialRecordById = vi.fn();
vi.mock("@/server/strategy/strategy-trial-store", () => ({
  getStrategyTrialRecordById: (id: string) => mockGetStrategyTrialRecordById(id),
}));

const mockGetBacktestResult = vi.fn();
vi.mock("@/server/backtest/backtest-result-store", () => ({
  getBacktestResult: (runId: string) => mockGetBacktestResult(runId),
}));

import { auditMarketExposureFromTrial } from "./market-exposure-auditor";

describe("MarketExposureAuditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return not_available if the trial is not found", async () => {
    mockGetStrategyTrialRecordById.mockResolvedValue(null);

    const result = await auditMarketExposureFromTrial({ trialId: "trial-1" });
    expect(result.assessment).toBe("not_available");
    expect(result.warnings).toContain("insufficient_benchmark_data");
  });

  it("should return not_available if backtest run is missing", async () => {
    mockGetStrategyTrialRecordById.mockResolvedValue({
      id: "trial-1",
      strategyId: "momentum_v1",
      universeId: "KOSPI_SAMPLE",
      backtestRunId: null,
    });

    const result = await auditMarketExposureFromTrial({ trialId: "trial-1" });
    expect(result.assessment).toBe("not_available");
  });

  it("should return insufficient_sample if valid observations are less than 3", async () => {
    mockGetStrategyTrialRecordById.mockResolvedValue({
      id: "trial-1",
      strategyId: "momentum_v1",
      universeId: "KOSPI_SAMPLE",
      backtestRunId: "run-1",
    });

    mockGetBacktestResult.mockResolvedValue({
      runId: "run-1",
      oosSummaries: [
        { longOnlyReturn: 0.05, benchmarkReturn: 0.02 }, // Only 1 observation
      ],
    });

    const result = await auditMarketExposureFromTrial({ trialId: "trial-1" });
    expect(result.assessment).toBe("insufficient_sample");
    expect(result.warnings).toContain("insufficient_benchmark_data");
  });

  it("should calculate beta, correlation, capture ratios and excess return correctly", async () => {
    mockGetStrategyTrialRecordById.mockResolvedValue({
      id: "trial-1",
      strategyId: "momentum_v1",
      universeId: "KOSPI_SAMPLE",
      backtestRunId: "run-1",
    });

    // We create 5 walk-forward window summaries
    // S = [0.02, 0.04, -0.01, 0.05, -0.02]
    // B = [0.01, 0.02, -0.01, 0.03, -0.01]
    mockGetBacktestResult.mockResolvedValue({
      runId: "run-1",
      oosSummaries: [
        { longOnlyReturn: 0.02, benchmarkReturn: 0.01, benchmarkAssetId: "KR:KOSPI" },
        { longOnlyReturn: 0.04, benchmarkReturn: 0.02, benchmarkAssetId: "KR:KOSPI" },
        { longOnlyReturn: -0.01, benchmarkReturn: -0.01, benchmarkAssetId: "KR:KOSPI" },
        { longOnlyReturn: 0.05, benchmarkReturn: 0.03, benchmarkAssetId: "KR:KOSPI" },
        { longOnlyReturn: -0.02, benchmarkReturn: -0.01, benchmarkAssetId: "KR:KOSPI" },
      ],
    });

    const result = await auditMarketExposureFromTrial({ trialId: "trial-1" });

    expect(result.sampleSize).toBe(5);
    expect(result.benchmarkAssetId).toBe("KR:KOSPI");

    // beta = cov(S, B) / var(B)
    // Mean B = 0.008, Mean S = 0.016
    // cov = ((0.02-0.016)*(0.01-0.008) + (0.04-0.016)*(0.02-0.008) + (-0.01-0.016)*(-0.01-0.008) + (0.05-0.016)*(0.03-0.008) + (-0.02-0.016)*(-0.01-0.008)) / 5
    // cov = (0.004*0.002 + 0.024*0.012 + -0.026*-0.018 + 0.034*0.022 + -0.036*-0.018) / 5
    // cov = (0.000008 + 0.000288 + 0.000468 + 0.000748 + 0.000648) / 5 = 0.00216 / 5 = 0.000432
    // var B = ((0.01-0.008)^2 + (0.02-0.008)^2 + (-0.01-0.008)^2 + (0.03-0.008)^2 + (-0.01-0.008)^2) / 5
    // var B = (0.000004 + 0.000144 + 0.000324 + 0.000484 + 0.000324) / 5 = 0.00128 / 5 = 0.000256
    // beta = 0.000432 / 0.000256 = 1.6875
    expect(result.beta).toBe(1.6875);

    // beta >= 1.2 triggers high_beta warning
    expect(result.warnings).toContain("high_beta");
    expect(result.assessment).toBe("market_dependent");

    // upMarketAvgReturn = average of strategy returns where benchmark > 0 (0.02, 0.04, 0.05) = 0.0367
    expect(result.upMarketAvgReturn).toBe(0.0367);

    // downMarketAvgReturn = average where benchmark < 0 (-0.01, -0.02) = -0.015
    expect(result.downMarketAvgReturn).toBe(-0.015);

    // averageExcessReturn = mean(S - B) = mean([0.01, 0.02, 0.00, 0.02, -0.01]) = 0.008
    expect(result.averageExcessReturn).toBe(0.008);
  });

  it("should return not_available and warning insufficient_benchmark_data if beta/correlation is null", async () => {
    mockGetStrategyTrialRecordById.mockResolvedValue({
      id: "trial-1",
      strategyId: "momentum_v1",
      universeId: "KOSPI_SAMPLE",
      backtestRunId: "run-1",
    });

    // We make benchmark returns all constant so variance of B is 0, making beta/correlation null
    mockGetBacktestResult.mockResolvedValue({
      runId: "run-1",
      oosSummaries: [
        { longOnlyReturn: 0.02, benchmarkReturn: 0.01, benchmarkAssetId: "KR:KOSPI" },
        { longOnlyReturn: 0.04, benchmarkReturn: 0.01, benchmarkAssetId: "KR:KOSPI" },
        { longOnlyReturn: -0.01, benchmarkReturn: 0.01, benchmarkAssetId: "KR:KOSPI" },
      ],
    });

    const result = await auditMarketExposureFromTrial({ trialId: "trial-1" });
    expect(result.assessment).toBe("not_available");
    expect(result.warnings).toContain("insufficient_benchmark_data");
  });
});
