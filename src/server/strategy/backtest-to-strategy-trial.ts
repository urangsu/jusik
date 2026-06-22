import { BacktestResult } from "@/domain/backtest/backtest-result";
import { StrategyTrialRecord, StrategyTrialObservedMetrics } from "@/domain/strategy/strategy-trial-record";
import { StrategyBiasWarning } from "@/domain/strategy/strategy-bias-warning";
import { StrategyTrialStatus } from "@/domain/strategy/strategy-trial-status";
import { createStrategyTrialId } from "./strategy-trial-id";
import { createStrategyParameterHash } from "./strategy-parameter-hash";

export function createStrategyTrialFromBacktest(input: {
  result: BacktestResult;
  variantId?: string;
  thesisKo?: string;
  hypothesis?: string;
  parameters?: Record<string, unknown>;
  sourceBacktestResultPath?: string | null;
}): StrategyTrialRecord {
  const { result } = input;
  const variantId = input.variantId || "baseline";
  const thesisKo = input.thesisKo || "momentum_v1 점수 기준 상위 종목을 동일비중으로 편입하는 전략 후보를 기능 검증한다.";
  const hypothesis = input.hypothesis || "상대적으로 높은 momentum_v1 점수를 가진 종목군이 OOS 구간에서 더 나은 forward return을 보이는지 확인한다.";

  const parameters = {
    strategy: result.strategy,
    universeId: result.universeId,
    ...input.parameters,
  };
  const parameterHash = createStrategyParameterHash(parameters);

  const createdAt = new Date().toISOString();
  const id = createStrategyTrialId({
    strategyId: result.strategy,
    universeId: result.universeId,
    variantId,
    createdAt,
  });

  // Calculate validationStatus based on BacktestResult status & validityReport level
  let validationStatus: StrategyTrialStatus = "backtested";
  if (result.status === "failed" || result.validityReport?.level === "invalid") {
    validationStatus = "invalid";
  } else if (result.validityReport?.level === "insufficient_data") {
    validationStatus = "insufficient_data";
  }

  // Validity level mapping
  const validityLevel = result.validityReport?.level || null;

  // Map warnings/vetoReasons/validityReport reasons to StrategyBiasWarning
  const warningSet = new Set<StrategyBiasWarning>();
  const allWarnings = [
    ...(result.warnings || []),
    ...(result.vetoReasons || []),
    ...(result.validityReport?.reasons || []),
  ];

  const mapWarning = (w: string): StrategyBiasWarning | null => {
    switch (w) {
      case "sample_universe_only":
        return "sample_universe_only";
      case "missing_adjusted_price":
        return "adjusted_price_missing";
      case "no_historical_universe_membership":
        return "no_historical_universe_membership";
      case "personal_fallback_used":
        return "personal_fallback_used";
      case "insufficient_oos_windows":
        return "insufficient_oos_period";
      case "insufficient_ic_pairs":
        return "insufficient_ic_pairs";
      case "missing_benchmark":
        return "missing_benchmark";
      case "low_data_quality":
        return "low_data_quality";
      case "not_for_investment_decision":
        return "functional_check_only";
      default:
        return null;
    }
  };

  for (const w of allWarnings) {
    const mapped = mapWarning(w);
    if (mapped) {
      warningSet.add(mapped);
    }
  }

  const biasWarnings = Array.from(warningSet);

  // observedMetrics
  const totalSelectedPositions = result.oosSummaries.reduce(
    (sum, s) => sum + (s.selectedPositions ? s.selectedPositions.length : 0),
    0
  );

  const observedMetrics: StrategyTrialObservedMetrics = {
    oosReturn: result.aggregated.totalReturn,
    benchmarkReturn: result.aggregated.benchmarkTotalReturn,
    excessReturn: result.aggregated.excessTotalReturn,
    sharpe: null,
    maxDrawdown: result.aggregated.maxDrawdown,
    spearmanIc: result.aggregated.icMean,
    icir: result.aggregated.icir,
    hitRate: result.aggregated.hitRateMean,
    turnover: result.aggregated.turnover,
    nOosWindows: result.aggregated.nOosWindows,
    nValidReturnWindows: result.aggregated.nValidReturnWindows,
    nValidIcWindows: result.aggregated.nValidIcWindows,
    totalSelectedPositions,
  };

  // failureConditionSummary
  const failureConditionSummary = {
    hasInvalidBacktest: result.status === "failed" || result.validityReport?.level === "invalid",
    hasInsufficientData: result.validityReport?.level === "insufficient_data",
    hasMissingBenchmark: biasWarnings.includes("missing_benchmark"),
    hasLowDataQuality: biasWarnings.includes("low_data_quality"),
    hasInsufficientIcPairs: biasWarnings.includes("insufficient_ic_pairs"),
    hasPersonalFallback: biasWarnings.includes("personal_fallback_used"),
    hasSampleUniverseOnly: biasWarnings.includes("sample_universe_only"),
    hasAdjustedPriceMissing: biasWarnings.includes("adjusted_price_missing"),
    hasNoHistoricalUniverseMembership: biasWarnings.includes("no_historical_universe_membership"),
  };

  // postmortemSummary calculation
  let signalPostmortemCount = 0;
  let failedPositionCount = 0;
  let positivePositionCount = 0;
  let negativePositionCount = 0;
  let missingPricePositionCount = 0;

  for (const summary of result.oosSummaries) {
    if (!summary.selectedPositions) continue;
    for (const pos of summary.selectedPositions) {
      signalPostmortemCount++;
      const entryPrice = pos.entryPrice;
      const exitPrice = pos.exitPrice;
      const netReturn = pos.netReturn;

      if (entryPrice === null || exitPrice === null) {
        missingPricePositionCount++;
        failedPositionCount++;
      } else if (netReturn === null) {
        // not_evaluable
      } else if (netReturn > 0.01) {
        positivePositionCount++;
      } else if (netReturn < -0.01) {
        negativePositionCount++;
        failedPositionCount++;
      } else {
        // flat
      }
    }
  }

  const postmortemSummary = {
    signalPostmortemCount,
    failedPositionCount,
    positivePositionCount,
    negativePositionCount,
    missingPricePositionCount,
  };

  // DataWindow
  const sortedSummaries = [...result.oosSummaries].sort((a, b) => a.testStart.localeCompare(b.testStart));
  const dataWindow = {
    startDate: sortedSummaries.length > 0 ? sortedSummaries[0].testStart : "",
    endDate: sortedSummaries.length > 0 ? sortedSummaries[sortedSummaries.length - 1].testEnd : "",
  };

  return {
    id,
    strategyId: result.strategy,
    variantId,
    strategyFamily: "momentum", // momentum_v1_long_only belongs to momentum family
    thesisKo,
    hypothesis,
    parameters,
    parameterHash,
    universeId: result.universeId,
    dataWindow,
    backtestRunId: result.runId,
    observedMetrics,
    validationStatus,
    validityLevel,
    rejectionReason: null,
    biasWarnings,
    failureConditionSummary,
    postmortemSummary,
    sourceBacktestResultPath: input.sourceBacktestResultPath || null,
    createdAt,
    updatedAt: createdAt,
    engineVersion: result.engineVersion || "1.0.0",
  };
}
