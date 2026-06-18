import { WalkForwardWindow } from "@/domain/backtest/walk-forward-window";
import { PortfolioPosition } from "@/domain/backtest/portfolio-position";
import { MarketCostConfig } from "@/domain/backtest/transaction-cost";
import {
  OosPeriodSummary,
  BacktestAggregatedMetrics,
  BacktestSelectedPosition,
  BacktestWarningCode,
  BacktestValidityReport,
  BacktestValidityLevel,
} from "@/domain/backtest/backtest-result";
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
  validityReport: BacktestValidityReport;
};

export function generateValidityReport(
  universeId: string,
  nOosWindows: number,
  nValidReturnWindows: number,
  dataQualityScore: number,
  hasBenchmark: boolean,
  usedPersonalFallback: boolean
): BacktestValidityReport {
  const reasons: BacktestValidityReport["reasons"] = [];

  if (universeId.includes("SAMPLE")) {
    reasons.push("sample_universe_only");
    reasons.push("no_historical_universe_membership");
  }

  reasons.push("missing_adjusted_price");

  if (usedPersonalFallback) {
    reasons.push("personal_fallback_used");
  }

  if (nOosWindows < 3) {
    reasons.push("insufficient_oos_windows");
  }

  if (!hasBenchmark) {
    reasons.push("missing_benchmark");
  }

  if (dataQualityScore < 50) {
    reasons.push("low_data_quality");
  }

  let level: BacktestValidityLevel = "functional_check_only";
  let messageKo = "기능 검증용 백테스트입니다. 실전 적용이 불가합니다.";

  if (nOosWindows === 0 || dataQualityScore < 30) {
    level = "invalid";
    messageKo = "백테스트 결과가 무효합니다. 데이터 품질이 낮거나 OOS 구간이 없습니다.";
  } else if (nValidReturnWindows < 2 || dataQualityScore < 50) {
    level = "insufficient_data";
    messageKo = "데이터가 부족하여 전략 성과를 신뢰할 수 없습니다.";
  } else {
    const isResearchCandidate =
      !reasons.includes("sample_universe_only") &&
      !reasons.includes("missing_adjusted_price") &&
      !reasons.includes("no_historical_universe_membership") &&
      hasBenchmark &&
      nOosWindows >= 3;

    if (isResearchCandidate) {
      level = "research_candidate";
      messageKo = "연구 후보 등급의 백테스트 결과입니다. 추가 분석이 가능합니다.";
    } else {
      level = "functional_check_only";
      messageKo = "기능 검증용 백테스트입니다. 수정주가 및 과거 유니버스 미반영 상태입니다.";
    }
  }

  return { level, reasons, messageKo };
}

export async function simulateLongOnlyPortfolio(
  params: PortfolioSimulatorParams
): Promise<SimulationResult> {
  const { universeId, windows, maxPositions, minScore, costConfig, allowPersonalFallback } =
    params;

  const oosSummaries: OosPeriodSummary[] = [];
  let totalEntryCostBps = 0;
  let totalExitCostBps = 0;
  let usedPersonalFallback = false;

  const periodReturns: number[] = [];
  const prevWeights: Map<string, number> = new Map();

  const benchmarkAssetId = universeId === "KOSPI_SAMPLE" ? "KR:KOSPI" : "US:SPX";
  let hasBenchmark = false;
  let benchmarkBars: any[] = [];
  try {
    const ohlcvEnvBench = await loadOhlcvHistory(universeId, benchmarkAssetId);
    if (ohlcvEnvBench.value && ohlcvEnvBench.value.length > 0) {
      hasBenchmark = true;
      benchmarkBars = ohlcvEnvBench.value;
    }
  } catch (err) {
    console.warn("Failed to load benchmark history", benchmarkAssetId, err);
  }

  for (const window of windows) {
    const asOfDate = window.trainEnd;
    const entryDate = window.testStart;

    assertNoLookAheadBias({ signalDate: asOfDate, entryDate });

    const positions = await selectMomentumTopN({
      universeId,
      asOfDate,
      entryDate,
      maxPositions,
      minScore,
      allowPersonalFallback,
    });

    const vetoReasons: string[] = [];

    // Calculate turnover
    let windowTurnover: number | null = null;
    if (prevWeights.size > 0) {
      const allAssetIds = new Set([...prevWeights.keys(), ...positions.map((p) => p.assetId)]);
      let sumDiff = 0;
      for (const aid of allAssetIds) {
        const wPrev = prevWeights.get(aid) ?? 0;
        const posCurrent = positions.find((p) => p.assetId === aid);
        const wCurr = posCurrent ? posCurrent.weight : 0;
        sumDiff += Math.abs(wCurr - wPrev);
      }
      windowTurnover = 0.5 * sumDiff;
    }

    // Update prevWeights
    prevWeights.clear();
    for (const pos of positions) {
      prevWeights.set(pos.assetId, pos.weight);
    }

    // Benchmark return
    let benchmarkReturn: number | null = null;
    if (hasBenchmark) {
      const benchEntryBar = findBarOnOrAfter(benchmarkBars, entryDate);
      const benchExitBar = findBarOnOrBefore(benchmarkBars, window.testEnd);
      if (benchEntryBar && benchExitBar && benchEntryBar.date < benchExitBar.date) {
        benchmarkReturn = (benchExitBar.close - benchEntryBar.close) / benchEntryBar.close;
      }
    }

    if (positions.length === 0) {
      if (!hasBenchmark) vetoReasons.push("missing_benchmark");
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
        vetoReasons: [...vetoReasons, "insufficient_universe"],
        validIcPairCount: 0,
        selectedPositions: [],
        benchmarkAssetId: hasBenchmark ? benchmarkAssetId : null,
        benchmarkReturn,
        excessReturn: null,
        turnover: windowTurnover,
      });
      continue;
    }

    const icPairs: Array<{ score: number | null; forwardReturn: number | null }> = [];
    const selectedPositionsInPeriod: BacktestSelectedPosition[] = [];
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

      const entryCost = applyTransactionCost({ side: "buy", config: costConfig });
      const exitCost = applyTransactionCost({ side: "sell", config: costConfig });

      totalEntryCostBps += entryCost.totalBps;
      totalExitCostBps += exitCost.totalBps;

      let grossReturn: number | null = null;
      let netReturn: number | null = null;

      if (entryBar && exitBar && entryBar.date < exitBar.date) {
        grossReturn = (exitBar.close - entryBar.close) / entryBar.close;
        netReturn = grossReturn - bpsToFraction(entryCost.totalBps + exitCost.totalBps);
        totalNetReturn += netReturn * pos.weight;
        positionCount++;
      }

      icPairs.push({
        score: pos.signalScore,
        forwardReturn: netReturn,
      });

      selectedPositionsInPeriod.push({
        assetId: pos.assetId,
        symbol: pos.symbol,
        rank: pos.rank,
        signalScore: pos.signalScore,
        weight: pos.weight,
        entryDate: pos.entryDate,
        entryPrice: entryBar?.close ?? null,
        exitDate: exitBar?.date ?? null,
        exitPrice: exitBar?.close ?? null,
        grossReturn,
        netReturn,
        entryCostBps: entryCost.totalBps,
        exitCostBps: exitCost.totalBps,
        factorId: "momentum_v1",
        factorAsOfDate: pos.factorAsOfDate,
        sourceSignalIds: pos.sourceSignalIds,
        dataStatus: pos.dataStatus,
        sourceTier: pos.sourceTier,
        warnings: pos.warnings,
      });
    }

    const periodReturn = positionCount > 0 ? totalNetReturn : null;
    if (periodReturn !== null) periodReturns.push(periodReturn);

    // IC Calculation (filter out nulls)
    const validPairs = icPairs.filter(
      (p) =>
        p.score !== null &&
        p.forwardReturn !== null &&
        Number.isFinite(p.score) &&
        Number.isFinite(p.forwardReturn)
    );
    const validIcPairCount = validPairs.length;

    const icResult = calculateSpearmanIC(icPairs);

    const dataQualityScore =
      positionCount > 0 ? Math.round((positionCount / positions.length) * 100) : 0;

    if (positions.length < 3) vetoReasons.push("insufficient_universe");
    if (dataQualityScore < 50) vetoReasons.push("low_data_quality");
    if (validIcPairCount < 3) vetoReasons.push("insufficient_ic_pairs");
    if (!hasBenchmark || benchmarkReturn === null) vetoReasons.push("missing_benchmark");

    const excessReturn =
      periodReturn !== null && benchmarkReturn !== null ? periodReturn - benchmarkReturn : null;

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
      validIcPairCount,
      selectedPositions: selectedPositionsInPeriod,
      benchmarkAssetId: hasBenchmark ? benchmarkAssetId : null,
      benchmarkReturn: benchmarkReturn !== null ? Math.round(benchmarkReturn * 10000) / 10000 : null,
      excessReturn: excessReturn !== null ? Math.round(excessReturn * 10000) / 10000 : null,
      turnover: windowTurnover !== null ? Math.round(windowTurnover * 10000) / 10000 : null,
    });
  }

  const compoundedTotalReturn =
    periodReturns.length > 0
      ? periodReturns.reduce((equity, r) => equity * (1 + r), 1) - 1
      : null;

  const aggregated = aggregateMetrics(
    oosSummaries,
    periodReturns,
    totalEntryCostBps,
    totalExitCostBps,
    compoundedTotalReturn
  );

  const validityReport = generateValidityReport(
    universeId,
    windows.length,
    periodReturns.length,
    aggregated.totalReturn !== null ? 100 : 0, // simple proxy for aggregate score
    hasBenchmark,
    usedPersonalFallback
  );

  return { oosSummaries, aggregated, usedPersonalFallback, validityReport };
}

function aggregateMetrics(
  summaries: OosPeriodSummary[],
  periodReturns: number[],
  totalEntryCostBps: number,
  totalExitCostBps: number,
  compoundedTotalReturn: number | null
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

  // Turnover Mean
  const validTurnovers = summaries.map((s) => s.turnover).filter((t): t is number => t !== null);
  const turnoverMean =
    validTurnovers.length > 0
      ? validTurnovers.reduce((a, b) => a + b, 0) / validTurnovers.length
      : null;

  // Benchmark return mean & compounded
  const validBenchmarkReturns = summaries
    .map((s) => s.benchmarkReturn)
    .filter((v): v is number => v !== null);
  
  let benchmarkTotalReturn: number | null = null;
  let excessTotalReturn: number | null = null;

  if (validBenchmarkReturns.length === summaries.length && compoundedTotalReturn !== null) {
    benchmarkTotalReturn = validBenchmarkReturns.reduce((equity, r) => equity * (1 + r), 1) - 1;
    benchmarkTotalReturn = Math.round(benchmarkTotalReturn * 10000) / 10000;
    excessTotalReturn = Math.round((compoundedTotalReturn - benchmarkTotalReturn) * 10000) / 10000;
  }

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
    totalReturn: compoundedTotalReturn !== null ? Math.round(compoundedTotalReturn * 10000) / 10000 : null,
    maxDrawdown: maxDrawdown !== null ? Math.round(maxDrawdown * 10000) / 10000 : null,
    turnover: turnoverMean !== null ? Math.round(turnoverMean * 10000) / 10000 : null,
    transactionCostTotalBps: Math.round(totalEntryCostBps + totalExitCostBps),
    slippageCostTotalBps: 0,
    nOosWindows: summaries.length,
    nValidReturnWindows: periodReturns.length,
    nValidIcWindows: validICs.length,
    benchmarkTotalReturn,
    excessTotalReturn,
  };
}
