export type SurgeCandidateReason =
  | "price_change"
  | "volume_spike"
  | "volatility_expansion"
  | "relative_strength"
  | "filing_event"
  | "market_attention";

export type SurgeCandidateStatus =
  | "new"
  | "reviewed"
  | "promoted_to_watchlist"
  | "dismissed"
  | "expired";

export type SurgeCandidate = {
  id: string;

  assetId: string;
  symbol: string;
  market: "KR" | "US";

  reasons: SurgeCandidateReason[];

  metrics: {
    priceChangePct: number | null;
    return5dPct?: number | null;
    return20dPct?: number | null;
    volumeRatio: number | null;
    volumeZScore?: number | null;
    tradingValue?: number | null;
    volatilityRatio: number | null;
    relativeStrength: number | null;
    closeLocationValue?: number | null;
    gapPct?: number | null;
  };

  score: number;
  scoreBreakdown: {
    priceScore: number;
    volumeScore: number;
    volatilityScore: number;
    relativeStrengthScore: number;
    liquidityScore?: number;
    filingEventScore?: number;
  };

  sourceRefs: string[];
  evidencePackId: string | null;

  status: SurgeCandidateStatus;

  detectedAt: string;
  expiresAt: string | null;
  updatedAt: string;
};
