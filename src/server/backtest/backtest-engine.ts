import { BacktestResult, BacktestWarningCode } from "@/domain/backtest/backtest-result";
import { BacktestRun, BacktestStrategy } from "@/domain/backtest/backtest-run";
import { getCostConfigForUniverse } from "@/domain/backtest/transaction-cost";
import { generateWalkForwardWindows } from "./walk-forward-generator";
import { simulateLongOnlyPortfolio } from "./portfolio-simulator";

export type BacktestConfig = {
  runId: string;
  strategy: BacktestStrategy;
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  startDate: string;
  endDate: string;
  trainDays?: number;
  testDays?: number;
  stepDays?: number;
  maxPositions?: number;
  minScore?: number;
  allowPersonalFallback?: boolean;
};

const ENGINE_VERSION = "1.0.0";

/** 기본 파라미터 */
const DEFAULTS = {
  trainDays: 90,
  testDays: 30,
  stepDays: 30,
  maxPositions: 5,
  minScore: 0,
};

/**
 * Price-only Walk-forward Backtest 오케스트레이터.
 * 
 * 경고:
 * - 이 백테스트는 기능 검증용이다.
 * - 재무 팩터, 수정주가, historical universe membership 미적용.
 * - not_for_investment_decision 경고는 절대 제거하지 않는다.
 */
export async function runPriceOnlyBacktest(
  config: BacktestConfig
): Promise<BacktestResult> {
  const {
    runId,
    strategy,
    universeId,
    startDate,
    endDate,
    trainDays = DEFAULTS.trainDays,
    testDays = DEFAULTS.testDays,
    stepDays = DEFAULTS.stepDays,
    maxPositions = DEFAULTS.maxPositions,
    minScore = DEFAULTS.minScore,
    allowPersonalFallback = true,
  } = config;

  const createdAt = new Date().toISOString();

  // 항상 포함되는 경고
  const warnings: BacktestWarningCode[] = [
    "not_for_investment_decision",
    "sample_universe_only",
    "missing_adjusted_price",
    "no_historical_universe_membership",
  ];

  try {
    // 1. Walk-forward windows 생성
    const windows = generateWalkForwardWindows({
      startDate,
      endDate,
      trainDays,
      testDays,
      stepDays,
    });

    // 2. 비용 모델 선택
    const costConfig = getCostConfigForUniverse(universeId);

    // 3. 시뮬레이션 실행
    const { oosSummaries, aggregated, usedPersonalFallback } =
      await simulateLongOnlyPortfolio({
        universeId,
        windows,
        maxPositions,
        minScore,
        costConfig,
        allowPersonalFallback,
      });

    if (usedPersonalFallback) {
      warnings.push("personal_fallback_used");
    }

    // 4. veto reasons 집계
    const vetoReasons: BacktestWarningCode[] = [];
    const nAssets = Math.max(...oosSummaries.map((s) => s.nAssets), 0);
    if (nAssets < 3) vetoReasons.push("insufficient_universe");

    const avgDataQuality =
      oosSummaries.length > 0
        ? oosSummaries.reduce((sum, s) => sum + s.dataQualityScore, 0) /
          oosSummaries.length
        : 0;
    if (avgDataQuality < 50) vetoReasons.push("low_data_quality");
    if (oosSummaries.length < 2) vetoReasons.push("insufficient_oos_windows");

    const dataQualityScore = Math.round(avgDataQuality);

    return {
      runId,
      strategy,
      universeId,
      status: "completed",
      windows,
      oosSummaries,
      aggregated,
      dataQualityScore,
      vetoReasons,
      warnings,
      sourceSummary: [
        {
          source: "yfinance (personal fallback)",
          sourceTier: "personal_fallback",
          warnings: ["unofficial", "personal_use_only"],
          assetCount: nAssets,
        },
      ],
      createdAt,
      engineVersion: ENGINE_VERSION,
    };
  } catch (err: any) {
    return {
      runId,
      strategy,
      universeId,
      status: "failed",
      windows: [],
      oosSummaries: [],
      aggregated: {
        icMean: null,
        icir: null,
        hitRateMean: null,
        totalReturn: null,
        maxDrawdown: null,
        turnover: null,
        transactionCostTotalBps: 0,
        slippageCostTotalBps: 0,
      },
      dataQualityScore: 0,
      vetoReasons: ["insufficient_universe", "low_data_quality"],
      warnings,
      sourceSummary: [],
      createdAt,
      engineVersion: ENGINE_VERSION,
    };
  }
}

/**
 * BacktestRun 메타데이터를 생성한다.
 */
export function createBacktestRun(config: BacktestConfig): BacktestRun {
  return {
    runId: config.runId,
    strategy: config.strategy,
    universeId: config.universeId,
    startDate: config.startDate,
    endDate: config.endDate,
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null,
    errorMessage: null,
  };
}
