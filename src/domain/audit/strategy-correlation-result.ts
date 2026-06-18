/**
 * StrategyCorrelationResult
 *
 * 두 전략 간 신호 상관관계 감사 결과.
 * 여러 전략이 동시에 같은 방향으로 깨지는지 확인하기 위한 진단 도구.
 *
 * 이 결과는 설명 목적이며, 주문 추천 또는 자동 전략 활성화와 연결되지 않는다.
 */
export type StrategyCorrelationSeverity =
  | "ok"
  | "warn"
  | "danger"
  | "insufficient_sample";

export type StrategyCorrelationResult = {
  /** 전략 A 식별자 */
  strategyA: string;

  /** 전략 B 식별자 */
  strategyB: string;

  /** 수익률 시계열 기반 상관관계 (null = 계산 불가) */
  returnCorrelation: number | null;

  /** 신호 점수 기반 상관관계 (null = 계산 불가) */
  signalCorrelation: number | null;

  /** 유효 관측 수 */
  sampleSize: number;

  /**
   * 심각도 분류:
   * - danger: |correlation| >= 0.75
   * - warn: 0.50 <= |correlation| < 0.75
   * - ok: |correlation| < 0.50
   * - insufficient_sample: sampleSize < 30
   */
  severity: StrategyCorrelationSeverity;

  /** 진단 메시지 */
  message: string;
};
