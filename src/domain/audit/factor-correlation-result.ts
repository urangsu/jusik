/**
 * FactorCorrelationResult
 *
 * 두 atomic signal/factor 간 신호 점수 상관관계 감사 결과.
 * 중복도가 높은 factor 조합을 탐지하여 다중공선성 및 분산 효과 감소 위험을 진단한다.
 */

export type FactorCorrelationMethod = "pearson" | "spearman";

export type FactorCorrelationSeverity =
  | "ok"
  | "warn"
  | "danger"
  | "insufficient_sample"
  | "not_available";

export type FactorCorrelationWarning =
  | "high_correlation"
  | "very_high_correlation"
  | "insufficient_sample"
  | "missing_factor_score"
  | "sample_universe_only"
  | "personal_fallback_used"
  | "source_tier_mixed";

export type FactorCorrelationResult = {
  /** 결과 고유 ID */
  id: string;

  /** 감사 대상 유니버스 */
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  /** 팩터 A 식별자 */
  factorA: string;

  /** 팩터 B 식별자 */
  factorB: string;

  /** 상관관계 계산 방식 (spearman, pearson) */
  method: FactorCorrelationMethod;

  /** 유효 오버랩 데이터 쌍 개수 */
  sampleSize: number;

  /** 오버랩 데이터에 포함된 거래일 수 */
  dateCount: number;

  /** 오버랩 데이터에 포함된 자산 수 */
  assetCount: number;

  /** 상관계수 값 (null인 경우 계산 불가) */
  correlation: number | null;

  /** 상관계수의 절대값 (null인 경우 계산 불가) */
  absCorrelation: number | null;

  /** 상관관계 위험 등급 */
  severity: FactorCorrelationSeverity;

  /** 경고 리스트 */
  warnings: FactorCorrelationWarning[];

  /** 데이터 소스 등급 요약 */
  sourceTierSummary:
    | "official"
    | "free_limited"
    | "licensed_free"
    | "personal_fallback"
    | "manual_import"
    | "mixed"
    | "unknown";

  /** 감사 연산 수행 시각 */
  calculatedAt: string;

  /** 감사 엔진 버전 */
  engineVersion: string;
};
