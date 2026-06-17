import { SourceUsagePolicy, SourceWarning } from "@/domain/source/provider-tier";
import { WalkForwardWindow } from "./walk-forward-window";
import { BacktestStrategy } from "./backtest-run";

export type BacktestWarningCode =
  | "sample_universe_only"
  | "personal_fallback_used"
  | "missing_adjusted_price"
  | "no_historical_universe_membership"
  | "not_for_investment_decision"
  | "insufficient_universe"
  | "low_data_quality"
  | "insufficient_oos_windows";

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
};

export type BacktestAggregatedMetrics = {
  icMean: number | null;
  icir: number | null;
  hitRateMean: number | null;
  totalReturn: number | null;
  maxDrawdown: number | null;
  turnover: number | null;
  transactionCostTotalBps: number;
  slippageCostTotalBps: number;
};

export type BacktestSourceSummary = {
  source: string;
  sourceTier: SourceUsagePolicy;
  warnings: SourceWarning[];
  assetCount: number;
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

  createdAt: string;
  engineVersion: string;
};
