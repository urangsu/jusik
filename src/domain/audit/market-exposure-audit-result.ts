import { StrategyBiasWarning } from "@/domain/strategy/strategy-trial-record";

/**
 * MarketExposureAuditResult
 *
 * 전략이 시장 상승에만 의존하는지 점검하는 진단 도구.
 * beta, 상승/하락 구간 성과, Regime별 성과를 분리해 측정한다.
 *
 * 이 결과는 설명 목적이며, 주문 추천, long-short 실거래와 연결되지 않는다.
 * 시장 노출도 분석만 수행한다.
 */
export type MarketNeutralityAssessment =
  | "market_neutral_like"
  | "market_directional"
  | "high_beta"
  | "insufficient_data";

export type MarketExposureAuditResult = {
  /** 전략 식별자 */
  strategyId: string;

  /** 테스트 유니버스 */
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  /** 벤치마크(유니버스 평균) 대비 Beta (null = 계산 불가) */
  betaToBenchmark: number | null;

  /** 벤치마크 대비 수익률 상관관계 (null = 계산 불가) */
  correlationToBenchmark: number | null;

  /** 시장 상승 구간 평균 수익률 (null = 계산 불가) */
  upMarketReturn: number | null;

  /** 시장 하락 구간 평균 수익률 (null = 계산 불가) */
  downMarketReturn: number | null;

  /** risk_off Regime 구간 평균 수익률 (null = 계산 불가) */
  riskOffReturn: number | null;

  /** panic Regime 구간 평균 수익률 (null = 계산 불가) */
  panicReturn: number | null;

  /**
   * 시장 중립성 평가:
   * - market_neutral_like: beta 낮고 down market에서도 방어적
   * - market_directional: 시장 방향 의존
   * - high_beta: betaToBenchmark > 1.2
   * - insufficient_data: 계산 불가
   */
  marketNeutralityAssessment: MarketNeutralityAssessment;

  /** 감지된 편향 경고 */
  warnings: StrategyBiasWarning[];
};
