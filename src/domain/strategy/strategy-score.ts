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
