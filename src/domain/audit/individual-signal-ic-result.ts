import { SignalContributionAssessment } from "./signal-contribution-assessment";
import { SignalAuditWarning } from "./signal-audit-warning";

export type SignalAuditHorizon = "1w" | "1m" | "3m";

export type IndividualSignalIcResult = {
  /** 결과 고유 식별자 (예: individual_signal_ic_<universeId>_<signalId>_<horizon>_<yyyymmddhhmmss>) */
  id: string;

  /** atomic signal 식별자 (예: "momentum_ichimoku", "momentum_return") */
  signalId: string;

  /** 한국어 라벨 (예: "일목균형표 신호", "수익률 모멘텀") */
  signalLabelKo: string | null;

  /** 테스트 유니버스 */
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  /** 평가 horizon */
  horizon: SignalAuditHorizon;

  /** 유효 관측 수 (valid pair count) */
  sampleSize: number;

  /** 관측된 총 거래일 수 */
  dateCount: number;

  /** 관측된 총 자산 수 */
  assetCount: number;

  /** Spearman Rank IC (null = 계산 불가) */
  spearmanIc: number | null;

  /** IC / std(IC) */
  icir: number | null;

  /** 신호 방향 일치 비율 (또는 score > median인 그룹의 forwardReturn > 0 비율) */
  hitRate: number | null;

  /** Momentum v1에서 이 신호의 현재 가중치 (0~1) */
  currentWeightInMomentumV1: number | null;

  /** 기여도 평가 */
  contributionAssessment: SignalContributionAssessment;

  /** 주의사항/경고 목록 */
  warnings: SignalAuditWarning[];

  /** 분석에 참여한 하위 시그널 총 개수 */
  sourceSignalCount: number;

  /** 계산 완료 시각 */
  calculatedAt: string;

  /** 감사 엔진 버전 */
  engineVersion: string;
};
