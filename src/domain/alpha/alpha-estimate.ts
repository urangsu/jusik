import { FactorId } from "@/domain/factors/factor-id";
import { FactorHealthBadge } from "@/domain/factors/factor-health";
import { SignalVersion } from "@/domain/signals/signal-version";

export type AlphaEstimate = {
  assetId: string;
  date: string;
  compositeAlphaScore: number | null;
  compositeAlphaRank: number | null;
  riskAdjustedRank: number | null;
  factorContributions: Array<{
    factorId: FactorId;
    exposure: number | null;
    health: FactorHealthBadge;
    contributionScore: number | null;
  }>;
  expectedAlphaAnnualized: number | null;
  expectedAlphaDisplayAllowed: boolean;
  confidence: "none" | "low" | "medium" | "high";
  reasonForSuppression?: string;
  engineVersion: string;
  configHash?: string;
  dataVersionId?: string;
  version?: SignalVersion;
};

export function createSuppressedAlphaEstimate(input: {
  assetId: string;
  date: string;
  engineVersion: string;
  reasonForSuppression?: string;
}): AlphaEstimate {
  return {
    assetId: input.assetId,
    date: input.date,
    compositeAlphaScore: null,
    compositeAlphaRank: null,
    riskAdjustedRank: null,
    factorContributions: [],
    expectedAlphaAnnualized: null,
    expectedAlphaDisplayAllowed: false,
    confidence: "none",
    reasonForSuppression: input.reasonForSuppression ?? "Expected alpha display is disabled in P0/P1.",
    engineVersion: input.engineVersion,
  };
}
