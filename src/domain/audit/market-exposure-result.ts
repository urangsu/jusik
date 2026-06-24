export type MarketExposureAssessment =
  | "market_dependent"
  | "partially_market_dependent"
  | "low_market_dependency"
  | "insufficient_sample"
  | "not_available";

export type MarketExposureWarning =
  | "high_beta"
  | "high_benchmark_correlation"
  | "down_market_underperformance"
  | "insufficient_benchmark_data"
  | "insufficient_oos_windows"
  | "sample_universe_only"
  | "regime_data_missing";

export type MarketExposureResult = {
  /** 결과 고유 ID */
  id: string;

  /** 연동된 StrategyTrial ID */
  trialId: string;

  /** 연동된 Backtest Run ID (null 가능) */
  backtestRunId: string | null;

  /** 전략 식별자 */
  strategyId: string;

  /** 테스트 유니버스 */
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  /** 벤치마크 자산 식별자 (null 가능) */
  benchmarkAssetId: string | null;

  /** 유효 오버랩 데이터 쌍 개수 */
  sampleSize: number;

  /** 벤치마크 대비 Beta */
  beta: number | null;

  /** 벤치마크 대비 수익률 상관계수 (Pearson) */
  benchmarkCorrelation: number | null;

  /** 시장 상승 구간 평균 수익률 (benchmarkReturn > 0) */
  upMarketAvgReturn: number | null;

  /** 시장 하락 구간 평균 수익률 (benchmarkReturn < 0) */
  downMarketAvgReturn: number | null;

  /** 상승 캡처 비율 */
  upCapture: number | null;

  /** 하락 캡처 비율 */
  downCapture: number | null;

  /** 평균 초과수익률 (strategyReturn - benchmarkReturn) */
  averageExcessReturn: number | null;

  /** 시장 노출도 평가 등급 */
  assessment: MarketExposureAssessment;

  /** 경고 리스트 */
  warnings: MarketExposureWarning[];

  /** 감사 연산 수행 시각 */
  calculatedAt: string;

  /** 감사 엔진 버전 */
  engineVersion: string;
};
