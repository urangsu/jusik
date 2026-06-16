export type AlertCondition =
  | PriceCrossCondition
  | ReturnZScoreCondition
  | VolumeZScoreCondition
  | GapMoveCondition
  | ProviderErrorCondition
  | FilingCondition
  | StrategyScoreChangeCondition
  | PortfolioRiskCondition;

export type PriceCrossCondition = {
  kind: "price_cross";
  direction: "above" | "below";
  price: number;
};

export type ReturnZScoreCondition = {
  kind: "return_zscore";
  returnWindow: "1D" | "3D" | "5D" | "20D";
  baselineWindow: 20 | 60 | 120;
  thresholdAbsZ: number;
  minAbsReturnPercent?: number;
  compareAgainst?: "asset_history" | "sector_history" | "universe_history";
};

export type VolumeZScoreCondition = {
  kind: "volume_zscore";
  baselineWindow: 20 | 60 | 120;
  thresholdZ: number;
  minVolumeMultiplier?: number;
};

export type GapMoveCondition = {
  kind: "gap_move";
  thresholdPercent: number;
  direction: "up" | "down" | "both";
};

export type ProviderErrorCondition = {
  kind: "provider_error";
  providerIds: string[];
  statuses: Array<"api_required" | "rate_limited" | "error" | "stale">;
};

export type FilingCondition = {
  kind: "new_filing";
  filingTypes?: string[];
  keywords?: string[];
};

export type StrategyScoreChangeCondition = {
  kind: "strategy_score_change";
  strategyIds: string[];
  minScore?: number;
  minScoreChange?: number;
};

export type PortfolioRiskCondition = {
  kind: "portfolio_risk";
  riskTypes: Array<"factor_concentration" | "drawdown" | "beta_overlap" | "data_quality_drop">;
};
