import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/server/surge/watchlist-promotion-gate", () => ({
  promoteSurgeCandidateToWatchlist: vi.fn(),
}));

import { promoteSurgeCandidateToWatchlist } from "@/server/surge/watchlist-promotion-gate";

describe("POST /api/surge/candidates/[id]/promote", () => {
  it("returns cached envelope of promotion details on success", async () => {
    vi.mocked(promoteSurgeCandidateToWatchlist).mockResolvedValue({
      candidate: {
        id: "cnd_ok",
        assetId: "US_AAPL",
        symbol: "AAPL",
        market: "US",
        reasons: ["price_change"],
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
        sourceRefs: [],
        evidencePackId: "evp_promo_cnd_ok",
        status: "promoted_to_watchlist",
        detectedAt: new Date().toISOString(),
        expiresAt: null,
        updatedAt: new Date().toISOString(),
      },
      watchlistItemId: "wli_ok",
      evidencePackId: "evp_promo_cnd_ok",
    });

    const req = new NextRequest("http://localhost/api/surge/candidates/cnd_ok/promote", {
      method: "POST",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "cnd_ok" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.watchlistItemId).toBe("wli_ok");
    expect(data.value.evidencePackId).toBe("evp_promo_cnd_ok");
  });
});
