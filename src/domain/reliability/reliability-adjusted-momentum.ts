import { ReliabilityWarning } from "./reliability-warning";

export type SignalLabel = "bullish" | "bearish" | "neutral" | "insufficient_data";

export type ReliabilityAdjustedMomentumPreview = {
  assetId: string;
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE";

  baseMomentumScore: number | null;
  reliabilityAdjustedScore: number | null;

  baseLabel: SignalLabel;
  reliabilityAdjustedLabel: SignalLabel;

  appliedMultipliers: {
    signalId: string;
    baseWeight: number;
    reliabilityWeightMultiplier: number | null;
    effectiveWeight: number | null;
    reason: string | null;
  }[];

  warnings: ReliabilityWarning[];

  calculatedAt: string;
};
