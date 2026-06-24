import { SignalContributionAssessment } from "./signal-contribution-assessment";
import { SignalAuditWarning } from "./signal-audit-warning";

export type SignalAuditHorizon = "1w" | "1m" | "3m";

export type IndividualSignalIcHorizon =
  | "forward_5d"
  | "forward_20d"
  | "forward_60d";

export type IndividualSignalIcSeverity =
  | "strong_positive"
  | "weak_positive"
  | "neutral"
  | "weak_negative"
  | "strong_negative"
  | "insufficient_sample"
  | "not_available";

export type IndividualSignalIcWarning =
  | "insufficient_sample"
  | "negative_ic"
  | "near_zero_ic"
  | "unstable_across_horizons"
  | "weak_signal_high_weight"
  | "missing_signal_score"
  | "missing_forward_return"
  | "sample_universe_only"
  | "personal_fallback_used"
  | "source_tier_mixed";

export type IndividualSignalIcResult = {
  /** 결과 고유 식별자 */
  id: string;

  /** atomic signal 식별자 */
  signalId: string;

  /** 한국어 라벨 */
  signalLabelKo: string | null;

  /** 테스트 유니버스 */
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  /** 평가 horizon */
  horizon: IndividualSignalIcHorizon;

  /** 유효 관측 수 (valid pair count) */
  sampleSize: number;

  /** 관측된 총 거래일 수 */
  dateCount: number;

  /** 관측된 총 자산 수 */
  assetCount: number;

  /** Pearson IC */
  icPearson: number | null;

  /** Spearman IC */
  icSpearman: number | null;

  /** Top quantile forward return 평균 */
  meanForwardReturnTopQuantile: number | null;

  /** Bottom quantile forward return 평균 */
  meanForwardReturnBottomQuantile: number | null;

  /** Top-Bottom spread */
  topBottomSpread: number | null;

  /** 심각도 등급 평가 */
  severity: IndividualSignalIcSeverity;

  /** 주의사항/경고 목록 */
  warnings: IndividualSignalIcWarning[];

  /** 원천 데이터 sourceTier 요약 */
  sourceTierSummary:
    | "official"
    | "free_limited"
    | "licensed_free"
    | "personal_fallback"
    | "manual_import"
    | "mixed"
    | "unknown";

  /** 계산 완료 시각 */
  calculatedAt: string;

  /** 감사 엔진 버전 */
  engineVersion: string;

  // 하위 호환성 필드
  spearmanIc?: number | null;
  icir?: number | null;
  hitRate?: number | null;
  currentWeightInMomentumV1?: number | null;
  contributionAssessment?: SignalContributionAssessment;
  sourceSignalCount?: number;
};
