import { SourceUsagePolicy } from "@/domain/source/provider-tier";
import { DataStatus } from "@/domain/common/data-status";
import { MarketRegime } from "./market-regime";

export type RegimeSnapshot = {
  id: string;

  market:
    | "US"
    | "KR";

  regime: MarketRegime;

  score: number | null; // 0~100

  confidence:
    | "low"
    | "medium"
    | "high";

  components: {
    trendScore: number | null;
    volatilityScore: number | null;
    creditScore: number | null;
    rateScore: number | null;
    fxScore: number | null;
    sentimentReferenceScore: number | null;
  };

  gates: {
    allowsNewWatch: boolean;
    allowsRiskUpgrading: boolean;
    suppressesMomentumAlert: boolean;
  };

  missingInputs: string[];

  warnings: string[];

  source: string;
  sourceTier: SourceUsagePolicy;
  dataStatus: DataStatus;
  updatedAt: string | null;

  calculatedAt: string;
  engineVersion: string;
};
