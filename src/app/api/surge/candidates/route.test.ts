import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/server/surge/surge-candidate-store", () => ({
  listSurgeCandidates: vi.fn(),
}));

vi.mock("@/server/surge/surge-candidate-detector", () => ({
  detectSurgeCandidates: vi.fn(),
}));

import { listSurgeCandidates } from "@/server/surge/surge-candidate-store";
import { detectSurgeCandidates } from "@/server/surge/surge-candidate-detector";

describe("Surge Candidate APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(listSurgeCandidates).mockResolvedValue([
      {
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
        evidencePackId: null,
        status: "new",
        detectedAt: new Date().toISOString(),
        expiresAt: null,
        updatedAt: new Date().toISOString(),
      },
    ]);

    vi.mocked(detectSurgeCandidates).mockResolvedValue([
      {
        id: "cnd_new",
        assetId: "KR_005930",
        symbol: "005930",
        market: "KR",
        reasons: ["volume_spike"],
        metrics: {
          priceChangePct: 0.01,
          volumeRatio: 4.5,
          volatilityRatio: 0.01,
          relativeStrength: 0.5,
        },
        score: 0.4,
        scoreBreakdown: {
          priceScore: 0.1,
          volumeScore: 0.9,
          volatilityScore: 0.2,
          relativeStrengthScore: 0.5,
        },
        sourceRefs: [],
        evidencePackId: null,
        status: "new",
        detectedAt: new Date().toISOString(),
        expiresAt: null,
        updatedAt: new Date().toISOString(),
      },
    ]);
  });

  it("GET lists candidates", async () => {
    const req = new NextRequest("http://localhost/api/surge/candidates?status=new");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value).toHaveLength(1);
    expect(data.value[0].symbol).toBe("AAPL");
  });

  it("POST triggers detector scan", async () => {
    const req = new NextRequest("http://localhost/api/surge/candidates/detect", {
      method: "POST",
      body: JSON.stringify({ market: "KR" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value[0].symbol).toBe("005930");
  });
});
