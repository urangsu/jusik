import { DataStatus } from "@/domain/common/data-status";

export type StrategyViewId =
  | "macro_first_largecap"
  | "wolcheon_pullback"
  | "stddev_mean_reversion"
  | "fundamental_quant"
  | "dividend_return"
  | "momentum";

export type StrategyViewSignal =
  | "positive_watch"
  | "neutral"
  | "caution"
  | "risk"
  | "insufficient_data";

export type StrategyViewScore = {
  assetId: string;
  symbol: string;
  date: string;
  strategyId: StrategyViewId;
  displayName: string;

  score: number | null;
  signal: StrategyViewSignal;
  confidence: "low" | "medium" | "high" | "none";
  status: DataStatus;
  dataQualityScore: number;

  bullishFactors: string[];
  bearishFactors: string[];
  vetoReasons: string[];
  explanation: string;
};
