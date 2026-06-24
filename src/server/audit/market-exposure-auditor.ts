import {
  MarketExposureResult,
  MarketExposureAssessment,
  MarketExposureWarning,
} from "@/domain/audit/market-exposure-result";
import { getStrategyTrialRecordById } from "@/server/strategy/strategy-trial-store";
import { getBacktestResult } from "@/server/backtest/backtest-result-store";

const ENGINE_VERSION = "1.0.0";

function round4(num: number | null): number | null {
  if (num === null || !Number.isFinite(num)) return null;
  return Math.round(num * 10000) / 10000;
}

/**
 * Pearson 상관계수를 계산한다.
 */
function pearson(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length === 0) return null;

  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  const covariance = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const stdX = Math.sqrt(xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0));
  const stdY = Math.sqrt(ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0));

  if (stdX === 0 || stdY === 0) return null;

  return covariance / (stdX * stdY);
}

export async function auditMarketExposureFromTrial(input: {
  trialId: string;
}): Promise<MarketExposureResult> {
  const { trialId } = input;
  const calculatedAt = new Date().toISOString();
  const timestampStr = calculatedAt.replace(/[-:TZ.]/g, "").slice(0, 14);
  const resultId = `market_exposure_${trialId}_${timestampStr}`;

  const trial = await getStrategyTrialRecordById(trialId);
  if (!trial) {
    return {
      id: resultId,
      trialId,
      backtestRunId: null,
      strategyId: "unknown",
      universeId: "KOSPI_SAMPLE",
      benchmarkAssetId: null,
      sampleSize: 0,
      beta: null,
      benchmarkCorrelation: null,
      upMarketAvgReturn: null,
      downMarketAvgReturn: null,
      upCapture: null,
      downCapture: null,
      averageExcessReturn: null,
      assessment: "not_available",
      warnings: ["insufficient_benchmark_data", "sample_universe_only"],
      calculatedAt,
      engineVersion: ENGINE_VERSION,
    };
  }

  const { strategyId, universeId, backtestRunId } = trial;

  if (!backtestRunId) {
    return {
      id: resultId,
      trialId,
      backtestRunId: null,
      strategyId,
      universeId,
      benchmarkAssetId: null,
      sampleSize: 0,
      beta: null,
      benchmarkCorrelation: null,
      upMarketAvgReturn: null,
      downMarketAvgReturn: null,
      upCapture: null,
      downCapture: null,
      averageExcessReturn: null,
      assessment: "not_available",
      warnings: ["insufficient_benchmark_data", "sample_universe_only"],
      calculatedAt,
      engineVersion: ENGINE_VERSION,
    };
  }

  const backtest = await getBacktestResult(backtestRunId);
  if (!backtest || !backtest.oosSummaries || backtest.oosSummaries.length === 0) {
    return {
      id: resultId,
      trialId,
      backtestRunId,
      strategyId,
      universeId,
      benchmarkAssetId: null,
      sampleSize: 0,
      beta: null,
      benchmarkCorrelation: null,
      upMarketAvgReturn: null,
      downMarketAvgReturn: null,
      upCapture: null,
      downCapture: null,
      averageExcessReturn: null,
      assessment: "not_available",
      warnings: ["insufficient_benchmark_data", "sample_universe_only"],
      calculatedAt,
      engineVersion: ENGINE_VERSION,
    };
  }

  const validObservations = backtest.oosSummaries
    .filter(
      (s) =>
        s.longOnlyReturn !== null &&
        s.benchmarkReturn !== null &&
        Number.isFinite(s.longOnlyReturn) &&
        Number.isFinite(s.benchmarkReturn)
    )
    .map((s) => ({
      strategyReturn: s.longOnlyReturn as number,
      benchmarkReturn: s.benchmarkReturn as number,
    }));

  const sampleSize = validObservations.length;
  const benchmarkAssetId = backtest.oosSummaries[0]?.benchmarkAssetId || null;

  const warnings: MarketExposureWarning[] = ["sample_universe_only", "regime_data_missing"];

  if (sampleSize < 3) {
    return {
      id: resultId,
      trialId,
      backtestRunId,
      strategyId,
      universeId,
      benchmarkAssetId,
      sampleSize,
      beta: null,
      benchmarkCorrelation: null,
      upMarketAvgReturn: null,
      downMarketAvgReturn: null,
      upCapture: null,
      downCapture: null,
      averageExcessReturn: null,
      assessment: "insufficient_sample",
      warnings: [...warnings, "insufficient_benchmark_data"],
      calculatedAt,
      engineVersion: ENGINE_VERSION,
    };
  }

  if (sampleSize < 10) {
    warnings.push("insufficient_oos_windows");
  }

  const stratReturns = validObservations.map((o) => o.strategyReturn);
  const benchReturns = validObservations.map((o) => o.benchmarkReturn);

  // 1. Beta calculation
  // beta = covariance(strategyReturn, benchmarkReturn) / variance(benchmarkReturn)
  const meanB = benchReturns.reduce((a, b) => a + b, 0) / sampleSize;
  const meanS = stratReturns.reduce((a, b) => a + b, 0) / sampleSize;

  let cov = 0;
  let varB = 0;
  for (let i = 0; i < sampleSize; i++) {
    cov += (stratReturns[i] - meanS) * (benchReturns[i] - meanB);
    varB += (benchReturns[i] - meanB) ** 2;
  }

  const beta = varB !== 0 ? cov / varB : null;

  // 2. Correlation calculation (Pearson)
  const benchmarkCorrelation = pearson(stratReturns, benchReturns);

  // 3. Up/Down market returns
  const upStratReturns = validObservations
    .filter((o) => o.benchmarkReturn > 0)
    .map((o) => o.strategyReturn);
  const upBenchReturns = validObservations
    .filter((o) => o.benchmarkReturn > 0)
    .map((o) => o.benchmarkReturn);

  const downStratReturns = validObservations
    .filter((o) => o.benchmarkReturn < 0)
    .map((o) => o.strategyReturn);
  const downBenchReturns = validObservations
    .filter((o) => o.benchmarkReturn < 0)
    .map((o) => o.benchmarkReturn);

  const upMarketAvgReturn =
    upStratReturns.length > 0 ? upStratReturns.reduce((a, b) => a + b, 0) / upStratReturns.length : null;
  const downMarketAvgReturn =
    downStratReturns.length > 0 ? downStratReturns.reduce((a, b) => a + b, 0) / downStratReturns.length : null;

  // 4. Capture ratios
  const upBenchAvg =
    upBenchReturns.length > 0 ? upBenchReturns.reduce((a, b) => a + b, 0) / upBenchReturns.length : 0;
  const downBenchAvg =
    downBenchReturns.length > 0 ? downBenchReturns.reduce((a, b) => a + b, 0) / downBenchReturns.length : 0;

  const upCapture =
    upMarketAvgReturn !== null && upBenchAvg !== 0 ? upMarketAvgReturn / upBenchAvg : null;
  const downCapture =
    downMarketAvgReturn !== null && downBenchAvg !== 0 ? downMarketAvgReturn / downBenchAvg : null;

  // 5. Average excess return
  const excessReturns = validObservations.map((o) => o.strategyReturn - o.benchmarkReturn);
  const averageExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / sampleSize;

  // Assessment logic
  let assessment: MarketExposureAssessment = "low_market_dependency";
  if (beta !== null && benchmarkCorrelation !== null) {
    const absBeta = Math.abs(beta);
    const absCorr = Math.abs(benchmarkCorrelation);

    if (absBeta >= 1.2 || absCorr >= 0.75) {
      assessment = "market_dependent";
    } else if (absBeta >= 0.7 || absCorr >= 0.5) {
      assessment = "partially_market_dependent";
    }
  } else {
    assessment = "not_available";
    if (!warnings.includes("insufficient_benchmark_data")) {
      warnings.push("insufficient_benchmark_data");
    }
  }

  // Warnings additions
  if (beta !== null && Math.abs(beta) >= 1.2) {
    warnings.push("high_beta");
  }
  if (benchmarkCorrelation !== null && Math.abs(benchmarkCorrelation) >= 0.75) {
    warnings.push("high_benchmark_correlation");
  }
  if (downMarketAvgReturn !== null && downMarketAvgReturn < -0.05) {
    warnings.push("down_market_underperformance");
  }

  return {
    id: resultId,
    trialId,
    backtestRunId,
    strategyId,
    universeId,
    benchmarkAssetId,
    sampleSize,
    beta: round4(beta),
    benchmarkCorrelation: round4(benchmarkCorrelation),
    upMarketAvgReturn: round4(upMarketAvgReturn),
    downMarketAvgReturn: round4(downMarketAvgReturn),
    upCapture: round4(upCapture),
    downCapture: round4(downCapture),
    averageExcessReturn: round4(averageExcessReturn),
    assessment,
    warnings,
    calculatedAt,
    engineVersion: ENGINE_VERSION,
  };
}
