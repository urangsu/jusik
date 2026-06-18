import { SourceUsagePolicy, SourceWarning } from "@/domain/source/provider-tier";
import { WalkForwardWindow } from "./walk-forward-window";
import { BacktestStrategy } from "./backtest-run";
import { DataStatus } from "@/domain/common/data-status";

export type BacktestWarningCode =
  | "sample_universe_only"
  | "personal_fallback_used"
  | "missing_adjusted_price"
  | "no_historical_universe_membership"
  | "not_for_investment_decision"
  | "insufficient_universe"
  | "low_data_quality"
  | "insufficient_oos_windows"
  | "missing_benchmark"
  | "insufficient_ic_pairs";

export type BacktestSelectedPosition = {
  assetId: string;
  symbol: string;

  rank: number;
  signalScore: number;

  weight: number;

  entryDate: string;
  entryPrice: number | null;

  exitDate: string | null;
  exitPrice: number | null;

  grossReturn: number | null;
  netReturn: number | null;

  entryCostBps: number;
  exitCostBps: number;

  factorId: "momentum_v1";
  factorAsOfDate: string;

  sourceSignalIds: string[];

  dataStatus: DataStatus;
  sourceTier: SourceUsagePolicy;
  warnings: string[];
};

export type OosPeriodSummary = {
  windowIndex: number;
  testStart: string;
  testEnd: string;

  /** Spearman rank IC. sample size < 5이면 null */
  ic: number | null;
  /** Spearman rank IC (=ic, 명시적 필드) */
  rankIc: number | null;
  /** 신호 방향과 수익률 방향 일치 비율 */
  hitRate: number | null;

  /** 비용 차감 후 Long-only 수익률 */
  longOnlyReturn: number | null;
  /** 참여 자산 수 */
  nAssets: number;

  /** 유효 신호 비율 (0~100) */
  dataQualityScore: number;
  /** 이 구간 결과를 신뢰할 수 없는 사유 */
  vetoReasons: string[];

  // WO-017-A additions:
  validIcPairCount: number;
  selectedPositions: BacktestSelectedPosition[];
  benchmarkAssetId: "KR:KOSPI" | "US:SPX" | null;
  benchmarkReturn: number | null;
  excessReturn: number | null;
  turnover: number | null;
};

export type BacktestAggregatedMetrics = {
  icMean: number | null;
  icir: number | null;
  hitRateMean: number | null;
  totalReturn: number | null; // compounded return
  maxDrawdown: number | null;
  turnover: number | null; // average turnover
  transactionCostTotalBps: number;
  slippageCostTotalBps: number;

  // WO-017-A additions:
  nOosWindows: number;
  nValidReturnWindows: number;
  nValidIcWindows: number;
  benchmarkTotalReturn: number | null;
  excessTotalReturn: number | null;
};

export type BacktestSourceSummary = {
  source: string;
  sourceTier: SourceUsagePolicy;
  warnings: SourceWarning[];
  assetCount: number;
};

export type BacktestValidityLevel =
  | "functional_check_only"
  | "research_candidate"
  | "insufficient_data"
  | "invalid";

export type BacktestValidityReport = {
  level: BacktestValidityLevel;

  reasons: (
    | "sample_universe_only"
    | "missing_adjusted_price"
    | "no_historical_universe_membership"
    | "personal_fallback_used"
    | "insufficient_oos_windows"
    | "insufficient_ic_pairs"
    | "missing_benchmark"
    | "low_data_quality"
  )[];

  messageKo: string;
};

export type BacktestResult = {
  runId: string;
  strategy: BacktestStrategy;
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  status: "completed" | "partial" | "failed";

  windows: WalkForwardWindow[];
  oosSummaries: OosPeriodSummary[];

  aggregated: BacktestAggregatedMetrics;

  /** 전체 유효 신호 비율 (0~100) */
  dataQualityScore: number;
  /**
   * 결과를 신뢰할 수 없는 사유.
   * 비어 있지 않으면 UI가 성과 숫자를 강조하지 않아야 한다.
   */
  vetoReasons: BacktestWarningCode[];

  /**
   * 항상 포함되는 경고.
   * "not_for_investment_decision"은 절대 제거하지 않는다.
   */
  warnings: BacktestWarningCode[];

  sourceSummary: BacktestSourceSummary[];

  validityReport: BacktestValidityReport;

  createdAt: string;
  engineVersion: string;
};
