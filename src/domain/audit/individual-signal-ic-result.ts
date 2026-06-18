/**
 * IndividualSignalIcResult
 *
 * 개별 atomic signal별 IC 감사 결과.
 * Momentum v1 composite IC만 보지 말고, 각 신호의 기여도를 개별로 측정한다.
 *
 * 이 결과는 설명 목적이며, 주문 추천 또는 자동 전략 활성화와 연결되지 않는다.
 */
export type SignalContributionAssessment =
  | "positive"
  | "neutral"
  | "negative"
  | "insufficient_sample";

export type IndividualSignalIcResult = {
  /** atomic signal 식별자 (예: "momentum_ichimoku", "return_20d") */
  signalId: string;

  /** 테스트 유니버스 */
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  /** 평가 horizon */
  horizon: "1w" | "1m" | "3m";

  /** 유효 관측 수 */
  sampleSize: number;

  /** Spearman Rank IC (null = 계산 불가) */
  spearmanIc: number | null;

  /** IC / std(IC) */
  icir: number | null;

  /** 신호 방향 일치 비율 */
  hitRate: number | null;

  /** Momentum v1에서 이 신호의 현재 가중치 (0~1) */
  currentWeightInMomentumV1: number | null;

  /** 기여도 평가 */
  contributionAssessment: SignalContributionAssessment;

  /** 주의사항 (null = 없음) */
  warning: string | null;
};
