import { describe, it, expect } from "vitest";
import { createStrategyTrialFromBacktest } from "./backtest-to-strategy-trial";
import { BacktestResult } from "@/domain/backtest/backtest-result";

describe("backtest-to-strategy-trial", () => {
  it("converts completed BacktestResult to StrategyTrialRecord correctly", () => {
    const mockBacktestResult: BacktestResult = {
      runId: "run-1",
      strategy: "momentum_v1_long_only",
      universeId: "KOSPI_SAMPLE",
      status: "completed",
      windows: [],
      oosSummaries: [
        {
          windowIndex: 0,
          testStart: "2026-01-01",
          testEnd: "2026-02-01",
          ic: 0.1,
          rankIc: 0.1,
          hitRate: 0.6,
          longOnlyReturn: 0.05,
          nAssets: 2,
          dataQualityScore: 90,
          vetoReasons: [],
          validIcPairCount: 2,
          selectedPositions: [
            {
              assetId: "KR:005930",
              symbol: "005930",
              rank: 1,
              signalScore: 90,
              weight: 0.5,
              entryDate: "2026-01-02",
              entryPrice: 1000,
              exitDate: "2026-02-01",
              exitPrice: 1100, // +10% return
              grossReturn: 0.1,
              netReturn: 0.1,
              entryCostBps: 0,
              exitCostBps: 0,
              factorId: "momentum_v1",
              factorAsOfDate: "2026-01-01",
              sourceSignalIds: [],
              dataStatus: "cached",
              sourceTier: "official",
              warnings: [],
            },
            {
              assetId: "KR:000660",
              symbol: "000660",
              rank: 2,
              signalScore: 85,
              weight: 0.5,
              entryDate: "2026-01-02",
              entryPrice: 2000,
              exitDate: "2026-02-01",
              exitPrice: 1900, // -5% return
              grossReturn: -0.05,
              netReturn: -0.05,
              entryCostBps: 0,
              exitCostBps: 0,
              factorId: "momentum_v1",
              factorAsOfDate: "2026-01-01",
              sourceSignalIds: [],
              dataStatus: "cached",
              sourceTier: "official",
              warnings: [],
            },
          ],
          benchmarkAssetId: "KR:KOSPI",
          benchmarkReturn: 0.02,
          excessReturn: 0.03,
          turnover: 0,
        },
      ],
      aggregated: {
        icMean: 0.1,
        icir: 1.0,
        hitRateMean: 0.6,
        totalReturn: 0.05,
        maxDrawdown: -0.05,
        turnover: 0,
        transactionCostTotalBps: 0,
        slippageCostTotalBps: 0,
        nOosWindows: 1,
        nValidReturnWindows: 1,
        nValidIcWindows: 1,
        benchmarkTotalReturn: 0.02,
        excessTotalReturn: 0.03,
      },
      dataQualityScore: 90,
      vetoReasons: [],
      warnings: ["sample_universe_only", "not_for_investment_decision"],
      sourceSummary: [],
      validityReport: {
        level: "functional_check_only",
        reasons: ["sample_universe_only"],
        messageKo: "기능 검증용",
      },
      createdAt: "2026-06-19T00:00:00.000Z",
      engineVersion: "1.0.0",
    };

    const trial = createStrategyTrialFromBacktest({
      result: mockBacktestResult,
    });

    expect(trial.strategyId).toBe("momentum_v1_long_only");
    expect(trial.validationStatus).toBe("backtested");
    expect(trial.observedMetrics.oosReturn).toBe(0.05);
    expect(trial.observedMetrics.totalSelectedPositions).toBe(2);
    expect(trial.postmortemSummary.signalPostmortemCount).toBe(2);
    expect(trial.postmortemSummary.positivePositionCount).toBe(1);
    expect(trial.postmortemSummary.negativePositionCount).toBe(1);
    expect(trial.biasWarnings).toContain("sample_universe_only");
    expect(trial.biasWarnings).toContain("functional_check_only");
    expect(trial.failureConditionSummary.hasSampleUniverseOnly).toBe(true);
  });
});
