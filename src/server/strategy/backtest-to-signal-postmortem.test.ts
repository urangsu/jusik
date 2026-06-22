import { describe, it, expect } from "vitest";
import { createSignalPostmortemsFromBacktest } from "./backtest-to-signal-postmortem";
import { BacktestResult } from "@/domain/backtest/backtest-result";

describe("backtest-to-signal-postmortem", () => {
  it("maps selected positions to signal postmortems with correct outcome classification", () => {
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
          nAssets: 3,
          dataQualityScore: 90,
          vetoReasons: [],
          validIcPairCount: 3,
          selectedPositions: [
            {
              assetId: "KR:005930",
              symbol: "005930",
              rank: 1,
              signalScore: 90,
              weight: 0.33,
              entryDate: "2026-01-02",
              entryPrice: 1000,
              exitDate: "2026-02-01",
              exitPrice: 1100, // +10%
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
              weight: 0.33,
              entryDate: "2026-01-02",
              entryPrice: 2000,
              exitDate: "2026-02-01",
              exitPrice: 1900, // -5%
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
            {
              assetId: "KR:035420",
              symbol: "035420",
              rank: 3,
              signalScore: 80,
              weight: 0.33,
              entryDate: "2026-01-02",
              entryPrice: null, // missing price
              exitDate: "2026-02-01",
              exitPrice: 1000,
              grossReturn: null,
              netReturn: null,
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
      warnings: [],
      sourceSummary: [],
      validityReport: {
        level: "functional_check_only",
        reasons: [],
        messageKo: "기능 검증용",
      },
      createdAt: "2026-06-19T00:00:00.000Z",
      engineVersion: "1.0.0",
    };

    const postmortems = createSignalPostmortemsFromBacktest({
      result: mockBacktestResult,
      trialId: "trial-abc",
    });

    expect(postmortems).toHaveLength(3);

    const pm1 = postmortems.find((p) => p.assetId === "KR:005930")!;
    expect(pm1.outcome).toBe("positive");
    expect(pm1.id).toBe("postmortem_trial-abc_0_KR_005930");

    const pm2 = postmortems.find((p) => p.assetId === "KR:000660")!;
    expect(pm2.outcome).toBe("negative");

    const pm3 = postmortems.find((p) => p.assetId === "KR:035420")!;
    expect(pm3.outcome).toBe("missing_price");
  });
});
