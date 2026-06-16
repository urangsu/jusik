import { DataEnvelope } from "../common/data-status";

export type MarketRegime =
  | "risk_on"
  | "selective_risk_on"
  | "neutral"
  | "risk_off"
  | "panic"
  | "overheated";

export type StrategyScore = {
  assetId: string;
  date: string;
  strategyId: string;
  score: number | null;
  rank: number | null;
  regime: MarketRegime;
  eligible: boolean;
  vetoReasons: string[];
  explanation: string;
  dataQualityScore: number;
};

export function validateStrategyEligibility(
  score: StrategyScore,
  dataEnvelopes: DataEnvelope<unknown>[]
): StrategyScore {
  const hasYfinanceOnly = dataEnvelopes.length > 0 && dataEnvelopes.every(
    (env) => env.sourceTier === "personal_fallback"
  );

  if (hasYfinanceOnly && score.eligible) {
    return {
      ...score,
      eligible: false,
      vetoReasons: Array.from(new Set([...score.vetoReasons, "personal_fallback_data_veto"])),
      explanation: `${score.explanation} (VETO: 비공식 개인 Fallback 데이터만으로 산출된 전략은 적격 처리할 수 없습니다.)`
    };
  }

  return score;
}
