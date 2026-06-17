import { WalkForwardWindow } from "@/domain/backtest/walk-forward-window";
import { PortfolioPosition } from "@/domain/backtest/portfolio-position";
import { MarketCostConfig } from "@/domain/backtest/transaction-cost";
import { OosPeriodSummary, BacktestAggregatedMetrics } from "@/domain/backtest/backtest-result";
import { loadOhlcvHistory } from "@/server/factors/ohlcv-history-loader";
import { applyTransactionCost, bpsToFraction } from "./transaction-cost-model";
import { selectMomentumTopN, findBarOnOrAfter, findBarOnOrBefore } from "./rebalance-engine";
import { calculateSpearmanIC } from "./backtest-ic-calculator";
import { assertNoLookAheadBias } from "@/domain/backtest/forward-return";

export type PortfolioSimulatorParams = {
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  windows: WalkForwardWindow[];
  maxPositions: number;
  minScore: number;
  costConfig: MarketCostConfig;
  allowPersonalFallback: boolean;
};

export type SimulationResult = {
  oosSummaries: OosPeriodSummary[];
  aggregated: BacktestAggregatedMetrics;
  usedPersonalFallback: boolean;
};

/**
 * Long-only equal-weight 포트폴리오 시뮬레이션.
 * 
 * 규칙:
 * - 각 testStart에서 리밸런싱 (asOfDate = trainEnd, entryDate = testStart)
 * - 진입 가격: testStart 이후 첫 사용 가능한 bar
 * - 청산 가격: testEnd 이하 마지막 사용 가능한 bar
 * - 거래비용 + 슬리피지 차감
 * - Train 구간 성과는 절대 최종 결과에 포함하지 않음
 */
export async function simulateLongOnlyPortfolio(
  params: PortfolioSimulatorParams
): Promise<SimulationResult> {
  const { universeId, windows, maxPositions, minScore, costConfig, allowPersonalFallback } =
    params;

  const oosSummaries: OosPeriodSummary[] = [];
  let totalEntryCostBps = 0;
  let totalExitCostBps = 0;
  let usedPersonalFallback = false;

  // 누적 수익률 추적 (max drawdown용)
  const periodReturns: number[] = [];

  for (const window of windows) {
    // 신호 조회 기준일 = trainEnd (OOS 시점 기준 가장 최근 신호)
    const asOfDate = window.trainEnd;
    const entryDate = window.testStart;

    // look-ahead bias 체크
    assertNoLookAheadBias({ signalDate: asOfDate, entryDate });

    // 리밸런싱 (Top N 선정)
    const positions = await selectMomentumTopN({
      universeId,
      asOfDate,
      entryDate,
      maxPositions,
      minScore,
      allowPersonalFallback,
    });

    const vetoReasons: string[] = [];

    if (positions.length === 0) {
      oosSummaries.push({
        windowIndex: window.windowIndex,
        testStart: window.testStart,
        testEnd: window.testEnd,
        ic: null,
        rankIc: null,
        hitRate: null,
        longOnlyReturn: null,
        nAssets: 0,
        dataQualityScore: 0,
        vetoReasons: ["insufficient_universe"],
      });
      continue;
    }

    // 각 포지션 청산 가격 조회 및 수익률 계산
    const icPairs: Array<{ score: number | null; forwardReturn: number | null }> = [];
    let totalNetReturn = 0;
    let positionCount = 0;

    for (const pos of positions) {
      const ohlcvEnv = await loadOhlcvHistory(universeId, pos.assetId);
      const bars = ohlcvEnv.value || [];

      if (ohlcvEnv.sourceTier === "personal_fallback") {
        usedPersonalFallback = true;
      }

      const exitBar = findBarOnOrBefore(bars, window.testEnd);
      const entryBar = findBarOnOrAfter(bars, entryDate);

      if (!entryBar || !exitBar || entryBar.date >= exitBar.date) {
        icPairs.push({ score: null, forwardReturn: null });
        continue;
      }

      // 비용 계산
      const entryCost = applyTransactionCost({ side: "buy", config: costConfig });
      const exitCost = applyTransactionCost({ side: "sell", config: costConfig });

      totalEntryCostBps += entryCost.totalBps;
      totalExitCostBps += exitCost.totalBps;

      // gross return
      const grossReturn = (exitBar.close - entryBar.close) / entryBar.close;
      // net return (비용 차감)
      const netReturn =
        grossReturn - bpsToFraction(entryCost.totalBps + exitCost.totalBps);

      icPairs.push({ score: null, forwardReturn: netReturn }); // score는 Factor Store에서 가져와야 하나 현재는 simplified
      totalNetReturn += netReturn * pos.weight;
      positionCount++;
    }

    const periodReturn = positionCount > 0 ? totalNetReturn : null;
    if (periodReturn !== null) periodReturns.push(periodReturn);

    // IC 계산 (현재 구현에서는 score가 없어 minimal)
    const icResult = calculateSpearmanIC(icPairs);

    const dataQualityScore =
      positionCount > 0 ? Math.round((positionCount / positions.length) * 100) : 0;

    if (positions.length < 3) vetoReasons.push("insufficient_universe");
    if (dataQualityScore < 50) vetoReasons.push("low_data_quality");

    oosSummaries.push({
      windowIndex: window.windowIndex,
      testStart: window.testStart,
      testEnd: window.testEnd,
      ic: icResult.ic,
      rankIc: icResult.rankIc,
      hitRate: icResult.hitRate,
      longOnlyReturn: periodReturn !== null ? Math.round(periodReturn * 10000) / 10000 : null,
      nAssets: positionCount,
      dataQualityScore,
      vetoReasons,
    });
  }

  // 집계 지표 계산
  const aggregated = aggregateMetrics(oosSummaries, periodReturns, totalEntryCostBps, totalExitCostBps);

  return { oosSummaries, aggregated, usedPersonalFallback };
}

function aggregateMetrics(
  summaries: OosPeriodSummary[],
  periodReturns: number[],
  totalEntryCostBps: number,
  totalExitCostBps: number
): BacktestAggregatedMetrics {
  const validICs = summaries.map((s) => s.ic).filter((v): v is number => v !== null);
  const icMean = validICs.length > 0 ? validICs.reduce((a, b) => a + b, 0) / validICs.length : null;

  let icir: number | null = null;
  if (icMean !== null && validICs.length >= 2) {
    const variance = validICs.reduce((sum, ic) => sum + (ic - icMean) ** 2, 0) / validICs.length;
    const std = Math.sqrt(variance);
    icir = std > 0 ? Math.round((icMean / std) * 10000) / 10000 : null;
  }

  const validHitRates = summaries.map((s) => s.hitRate).filter((v): v is number => v !== null);
  const hitRateMean =
    validHitRates.length > 0
      ? validHitRates.reduce((a, b) => a + b, 0) / validHitRates.length
      : null;

  // 누적 수익률 (단순 합산)
  const totalReturn =
    periodReturns.length > 0 ? periodReturns.reduce((a, b) => a + b, 0) : null;

  // Max Drawdown
  let maxDrawdown: number | null = null;
  if (periodReturns.length > 0) {
    let peak = 1;
    let equity = 1;
    let drawdown = 0;
    for (const r of periodReturns) {
      equity *= 1 + r;
      if (equity > peak) peak = equity;
      const dd = (peak - equity) / peak;
      if (dd > drawdown) drawdown = dd;
    }
    maxDrawdown = -drawdown;
  }

  return {
    icMean: icMean !== null ? Math.round(icMean * 10000) / 10000 : null,
    icir: icir !== null ? Math.round(icir * 10000) / 10000 : null,
    hitRateMean: hitRateMean !== null ? Math.round(hitRateMean * 10000) / 10000 : null,
    totalReturn: totalReturn !== null ? Math.round(totalReturn * 10000) / 10000 : null,
    maxDrawdown: maxDrawdown !== null ? Math.round(maxDrawdown * 10000) / 10000 : null,
    turnover: null, // TODO: WO-010에서 실제 turnover 계산
    transactionCostTotalBps: Math.round(totalEntryCostBps + totalExitCostBps),
    slippageCostTotalBps: 0, // 이미 totalBps에 포함
  };
}
