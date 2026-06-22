import { BacktestStrategy } from "@/domain/backtest/backtest-run";
import { BacktestValidityLevel } from "@/domain/backtest/backtest-result";
import { MarketRegime } from "@/domain/regime/market-regime";
import { StrategyFamily } from "./strategy-family";
import { StrategyTrialStatus } from "./strategy-trial-status";
import { StrategyBiasWarning } from "./strategy-bias-warning";
export type { StrategyBiasWarning };

export type StrategyTrialObservedMetrics = {
  oosReturn: number | null;
  benchmarkReturn: number | null;
  excessReturn: number | null;

  sharpe: number | null;
  maxDrawdown: number | null;

  spearmanIc: number | null;
  icir: number | null;
  hitRate: number | null;

  turnover: number | null;

  nOosWindows: number;
  nValidReturnWindows: number;
  nValidIcWindows: number;
  totalSelectedPositions: number;
};

export type StrategyTrialDataWindow = {
  startDate: string;
  endDate: string;
};

export type StrategyTrialRecord = {
  id: string;

  strategyId: BacktestStrategy;
  variantId: string;
  strategyFamily: StrategyFamily;

  thesisKo: string;
  hypothesis: string;

  parameters: Record<string, unknown>;
  parameterHash: string;

  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  dataWindow: StrategyTrialDataWindow;

  backtestRunId: string | null;

  observedMetrics: StrategyTrialObservedMetrics;

  validationStatus: StrategyTrialStatus;

  validityLevel: BacktestValidityLevel | null;

  rejectionReason: string | null;

  biasWarnings: StrategyBiasWarning[];

  failureConditionSummary: {
    hasInvalidBacktest: boolean;
    hasInsufficientData: boolean;
    hasMissingBenchmark: boolean;
    hasLowDataQuality: boolean;
    hasInsufficientIcPairs: boolean;
    hasPersonalFallback: boolean;
    hasSampleUniverseOnly: boolean;
    hasAdjustedPriceMissing: boolean;
    hasNoHistoricalUniverseMembership: boolean;
  };

  postmortemSummary: {
    signalPostmortemCount: number;
    failedPositionCount: number;
    positivePositionCount: number;
    negativePositionCount: number;
    missingPricePositionCount: number;
  };

  sourceBacktestResultPath: string | null;

  createdAt: string;
  updatedAt: string;

  engineVersion: string;
};

/**
 * StrategyTrialStore 저장 구조
 */
export type StrategyTrialStoreData = {
  trials: StrategyTrialRecord[];
  lastUpdatedAt: string;
};

export const EMPTY_STRATEGY_TRIAL_STORE: StrategyTrialStoreData = {
  trials: [],
  lastUpdatedAt: new Date(0).toISOString(),
};

/** MarketRegime별 성과 기록 */
export type RegimeConditionedPerformance = {
  strategyId: string;
  regime: MarketRegime;

  sampleSize: number;
  avgReturn: number | null;
  hitRate: number | null;
  maxDrawdown: number | null;
  spearmanIc: number | null;

  /** 샘플 부족, 데이터 출처 등 주의사항 */
  warning: string | null;
};
