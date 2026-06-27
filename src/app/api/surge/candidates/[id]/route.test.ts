import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/server/surge/surge-candidate-store", () => ({
  getSurgeCandidate: vi.fn(),
}));

import { getSurgeCandidate } from "@/server/surge/surge-candidate-store";

describe("GET /api/surge/candidates/[id]", () => {
  it("returns cached envelope of candidate on success", async () => {
    vi.mocked(getSurgeCandidate).mockResolvedValue({
      id: "cnd_test_1",
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
      evidencePackId: null,
      status: "new",
      detectedAt: new Date().toISOString(),
      expiresAt: null,
      updatedAt: new Date().toISOString(),
    });

    const req = new NextRequest("http://localhost/api/surge/candidates/cnd_test_1");
    const res = await GET(req, { params: Promise.resolve({ id: "cnd_test_1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.id).toBe("cnd_test_1");
    expect(data.value.symbol).toBe("AAPL");
  });

  it("returns not_found envelope when candidate is missing", async () => {
    vi.mocked(getSurgeCandidate).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/surge/candidates/cnd_missing");
    const res = await GET(req, { params: Promise.resolve({ id: "cnd_missing" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("not_found");
  });
});
