import { MarketRegime } from "@/domain/regime/market-regime";

/**
 * StrategyBiasWarning
 *
 * 전략 실험 기록에 첨부되는 편향 경고 태그.
 * 경고가 있다고 전략이 무효인 것은 아니지만, 결과 해석 시 반드시 고려해야 한다.
 */
export type StrategyBiasWarning =
  | "survivorship_bias_possible"
  | "lookahead_bias_possible"
  | "data_snooping_possible"
  | "insufficient_oos_period"
  | "sample_universe_only"
  | "adjusted_price_missing"
  | "high_parameter_sensitivity"
  | "high_market_beta"
  | "regime_dependency_high";

export type StrategyFamily =
  | "momentum"
  | "trend_breakout"
  | "mean_reversion"
  | "earnings_event"
  | "regime_defensive"
  | "other";

export type StrategyValidationStatus =
  | "draft"
  | "backtested"
  | "rejected"
  | "watch_candidate"
  | "frozen"
  | "retired";

/**
 * StrategyTrialRecord
 *
 * 전략 실험 기록. 성과가 좋든 나쁘든 모두 기록한다.
 * rejected 전략을 삭제하지 않는다. 전략 묘지를 유지해야 다중검정 위험을 추적할 수 있다.
 *
 * 이 기록은 실거래 주문, 자동 전략 등록과 연결되지 않는다.
 * human review를 거친 후에만 watch_candidate 이상으로 상태를 변경할 수 있다.
 */
export type StrategyTrialRecord = {
  /** 고유 식별자 (UUID or nanoid) */
  id: string;

  /** 전략 계열 식별자 (예: "momentum_v1_kospi") */
  strategyId: string;

  /** 파라미터 변형 식별자 (예: "window_20_vol_60") */
  variantId: string;

  /** 전략 패밀리 분류 */
  strategyFamily: StrategyFamily;

  /** 전략 가설 (한국어) */
  thesisKo: string;

  /** 전략 가설 (영어, 선택) */
  thesisEn?: string;

  /** 검증하고자 하는 시장 가설 (구체적 예측) */
  hypothesis: string;

  /** 전략 파라미터 */
  parameters: Record<string, unknown>;

  /** 파라미터 해시 (중복 감지용) */
  parameterHash: string;

  /** 테스트 유니버스 */
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  /** 데이터 기간 */
  dataWindow: {
    startDate: string;
    endDate: string;
  };

  /** 연결된 백테스트 runId (null이면 백테스트 미실행) */
  backtestRunId: string | null;

  /** 관측된 성과 지표 */
  observedMetrics: {
    oosReturn: number | null;
    sharpe: number | null;
    maxDrawdown: number | null;
    spearmanIc: number | null;
    icir: number | null;
    hitRate: number | null;
    turnover: number | null;
  };

  /** 검증 상태 */
  validationStatus: StrategyValidationStatus;

  /** 반려 사유 (rejected일 때 필수) */
  rejectionReason: string | null;

  /** 편향 경고 태그 목록 */
  biasWarnings: StrategyBiasWarning[];

  createdAt: string;
  updatedAt: string;
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
