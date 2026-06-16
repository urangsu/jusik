import { DataStatus } from "@/domain/common/data-status";
import { StrategyViewId } from "./strategy-view";

export type StrategyAgreementLabel =
  | "strong_watch"
  | "watch"
  | "neutral"
  | "caution"
  | "risk"
  | "insufficient_data";

export type StrategyAgreementSignal = {
  assetId: string;
  symbol: string;
  date: string;

  agreementScore: number | null;
  agreementLabel: StrategyAgreementLabel;

  agreementRate: number | null;
  participatingViews: StrategyViewId[];
  excludedViews: {
    strategyId: StrategyViewId;
    reason: string;
  }[];

  topBullishFactors: string[];
  topBearishFactors: string[];
  vetoReasons: string[];

  status: DataStatus;
  dataQualityScore: number;
  explanation: string;
};
