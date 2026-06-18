import { MarketRegime } from "@/domain/regime/market-regime";
import { StrategyAgreementLabel } from "./strategy-agreement-signal";

export type RegimeGateComponent = {
  market:
    | "US"
    | "KR";

  regime: MarketRegime;

  allowsNewWatch: boolean;
  allowsRiskUpgrading: boolean;

  confidence:
    | "low"
    | "medium"
    | "high";

  warning: string | null;
};

export type StrategySuitability = {
  assetId: string;
  symbol: string;
  date: string;

  suitabilityScore: number | null;
  originalLabel: StrategyAgreementLabel;
  adjustedLabel: StrategyAgreementLabel | "insufficient_data";

  regimeGate: RegimeGateComponent;
  warnings: string[];
  calculatedAt: string;
};
