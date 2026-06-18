import { describe, it, expect, vi, beforeEach } from "vitest";
import { simulateLongOnlyPortfolio } from "./portfolio-simulator";

vi.mock("./rebalance-engine", () => ({
  selectMomentumTopN: vi.fn(),
  findBarOnOrAfter: vi.fn((bars: any[], date: string) => bars.find(b => b.date >= date) || null),
  findBarOnOrBefore: vi.fn((bars: any[], date: string) => [...bars].reverse().find(b => b.date <= date) || null),
}));

vi.mock("@/server/factors/ohlcv-history-loader", () => ({
  loadOhlcvHistory: vi.fn(),
}));

import { selectMomentumTopN } from "./rebalance-engine";
import { loadOhlcvHistory } from "@/server/factors/ohlcv-history-loader";

const mockedSelectMomentumTopN = vi.mocked(selectMomentumTopN);
const mockedLoadOhlcvHistory = vi.mocked(loadOhlcvHistory);

describe("simulateLongOnlyPortfolio price warnings and benchmark validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appends price warnings to selected positions correctly", async () => {
    // 1. Mock selectMomentumTopN to return 1 position
    mockedSelectMomentumTopN.mockResolvedValue([
      {
        assetId: "KR:005930",
        symbol: "삼성전자",
        weight: 1.0,
        entryDate: "2025-01-11",
        entryPrice: 100,
        exitDate: null,
        exitPrice: null,
        grossReturn: null,
        netReturn: null,
        entryCostBps: 0,
        exitCostBps: 0,
        sourceSignalIds: ["yfinance"],
        rank: 1,
        signalScore: 90,
        factorId: "momentum_v1",
        factorAsOfDate: "2025-01-10",
        dataStatus: "cached",
        sourceTier: "personal_fallback",
        warnings: ["personal_fallback_used"], // factor warning
      }
    ]);

    // 2. Mock loadOhlcvHistory for asset price data
    mockedLoadOhlcvHistory.mockImplementation(async (universeId, assetId) => {
      if (assetId === "KR:KOSPI") {
        // Benchmark price bars
        return {
          value: [
            { date: "2025-01-11", close: 2000 },
            { date: "2025-02-10", close: 2100 }
          ],
          status: "cached",
          source: "kis",
          sourceTier: "official",
          warnings: []
        } as any;
      }
      // Asset price bars with personal fallback and stale status
      return {
        value: [
          { date: "2025-01-11", close: 100 },
          { date: "2025-02-10", close: 110 }
        ],
        status: "stale",
        source: "yfinance",
        sourceTier: "personal_fallback",
        warnings: ["unofficial"]
      } as any;
    });

    const result = await simulateLongOnlyPortfolio({
      universeId: "KOSPI_SAMPLE",
      windows: [
        {
          windowIndex: 0,
          trainStart: "2024-10-01",
          trainEnd: "2025-01-10",
          testStart: "2025-01-11",
          testEnd: "2025-02-10"
        }
      ],
      maxPositions: 2,
      minScore: 0,
      costConfig: {
        venue: "KRX_KOSPI",
        commissionBps: 1.5,
        transactionTaxBps: 5,
        agriculturalTaxBps: 15,
        slippageBps: 10
      },
      allowPersonalFallback: true
    });

    expect(result.oosSummaries).toHaveLength(1);
    const summary = result.oosSummaries[0];
    expect(summary.selectedPositions).toHaveLength(1);
    const pos = summary.selectedPositions[0];
    
    // Should have factor warning + price warnings
    expect(pos.warnings).toContain("personal_fallback_used");
    expect(pos.warnings).toContain("price_personal_fallback_used");
    expect(pos.warnings).toContain("price_stale");
  });

  it("adds missing_benchmark when benchmark return is null in a window", async () => {
    mockedSelectMomentumTopN.mockResolvedValue([
      {
        assetId: "KR:005930",
        symbol: "삼성전자",
        weight: 1.0,
        entryDate: "2025-01-11",
        entryPrice: 100,
        exitDate: null,
        exitPrice: null,
        grossReturn: null,
        netReturn: null,
        entryCostBps: 0,
        exitCostBps: 0,
        sourceSignalIds: [],
        rank: 1,
        signalScore: 90,
        factorId: "momentum_v1",
        factorAsOfDate: "2025-01-10",
        dataStatus: "cached",
        sourceTier: "official",
        warnings: [],
      }
    ]);

    mockedLoadOhlcvHistory.mockImplementation(async (universeId, assetId) => {
      if (assetId === "KR:KOSPI") {
        // Return empty benchmark data to cause null return
        return {
          value: [],
          status: "cached",
          source: "kis",
          sourceTier: "official",
          warnings: []
        } as any;
      }
      return {
        value: [
          { date: "2025-01-11", close: 100 },
          { date: "2025-02-10", close: 110 }
        ],
        status: "cached",
        source: "kis",
        sourceTier: "official",
        warnings: []
      } as any;
    });

    const result = await simulateLongOnlyPortfolio({
      universeId: "KOSPI_SAMPLE",
      windows: [
        {
          windowIndex: 0,
          trainStart: "2024-10-01",
          trainEnd: "2025-01-10",
          testStart: "2025-01-11",
          testEnd: "2025-02-10"
        }
      ],
      maxPositions: 2,
      minScore: 0,
      costConfig: {
        venue: "KRX_KOSPI",
        commissionBps: 1.5,
        transactionTaxBps: 5,
        agriculturalTaxBps: 15,
        slippageBps: 10
      },
      allowPersonalFallback: true
    });

    expect(result.validityReport.reasons).toContain("missing_benchmark");
    expect(result.oosSummaries[0].vetoReasons).toContain("missing_benchmark");
  });
});
