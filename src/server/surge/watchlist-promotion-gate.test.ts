import { describe, it, expect, vi, beforeEach } from "vitest";
import { promoteSurgeCandidateToWatchlist } from "./watchlist-promotion-gate";

vi.mock("./surge-candidate-store", () => {
  const store: Record<string, any> = {};
  return {
    saveSurgeCandidate: vi.fn(async (c) => {
      store[c.id] = c;
    }),
    getSurgeCandidate: vi.fn(async (id) => store[id] || null),
  };
});

vi.mock("../watchlist/watchlist-store", () => ({
  addWatchlistItem: vi.fn().mockResolvedValue(undefined),
  getWatchlistItemByAssetId: vi.fn().mockResolvedValue(null),
}));

vi.mock("../evidence/evidence-pack-store", () => ({
  saveEvidencePack: vi.fn().mockResolvedValue(undefined),
}));

import { getSurgeCandidate, saveSurgeCandidate } from "./surge-candidate-store";
import { addWatchlistItem } from "../watchlist/watchlist-store";
import { saveEvidencePack } from "../evidence/evidence-pack-store";

describe("watchlist-promotion-gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should promote candidate, transition status, and write watchlist/evidence records", async () => {
    const mockCandidate = {
      id: "cnd_test_promo",
      assetId: "US_AAPL",
      symbol: "AAPL",
      market: "US" as const,
      reasons: ["price_change" as const],
      metrics: {
        priceChangePct: 0.06,
        volumeRatio: 1.0,
        volatilityRatio: 0.02,
        relativeStrength: 0.5,
      },
      score: 0.5,
      scoreBreakdown: {
        priceScore: 0.6,
        volumeScore: 0.2,
        volatilityScore: 0.4,
        relativeStrengthScore: 0.5,
      },
      sourceRefs: ["ohlcv_US_AAPL"],
      evidencePackId: null,
      status: "new" as const,
      detectedAt: new Date().toISOString(),
      expiresAt: null,
      updatedAt: new Date().toISOString(),
    };

    await saveSurgeCandidate(mockCandidate);

    const result = await promoteSurgeCandidateToWatchlist({ candidateId: "cnd_test_promo" });

    // Assert status transition
    expect(result.candidate.status).toBe("promoted_to_watchlist");
    expect(result.candidate.evidencePackId).toBe("evp_promo_cnd_test_promo");

    // Verify watchlist addition call
    expect(addWatchlistItem).toHaveBeenCalled();

    // Verify evidence pack generation call
    expect(saveEvidencePack).toHaveBeenCalled();
    const packArg = vi.mocked(saveEvidencePack).mock.calls[0][0];
    expect(packArg.id).toBe("evp_promo_cnd_test_promo");
    expect(packArg.subjectId).toBe("US_AAPL");
    expect(packArg.claimTypes).toContain("price");
  });
});
