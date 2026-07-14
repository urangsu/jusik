import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/server/strategy/strategy-suitability-service", () => ({
  strategySuitabilityService: {
    calculateSuitability: vi.fn(),
  },
}));

import { strategySuitabilityService } from "@/server/strategy/strategy-suitability-service";

describe("GET /api/strategy/suitability", () => {
  it("returns 400 when parameters are missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/strategy/suitability?assetId=US_AAPL&universeId=SP500_SAMPLE")
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.value).toBeNull();
    expect(body.message).toContain("Missing required parameters");
  });

  it("returns 200 with suitability envelope on success", async () => {
    const mockSuitability = {
      assetId: "US_AAPL",
      symbol: "AAPL",
      date: "2026-07-05",
      signalId: "momentum",
      suitabilityScore: 85,
      originalLabel: "strong_watch",
      adjustedLabel: "strong_watch",
      regimeGate: {
        market: "US",
        regime: "neutral",
        allowsNewWatch: true,
        allowsRiskUpgrading: true,
        confidence: "high",
        warning: null,
      },
      warnings: [],
    };
    vi.mocked(strategySuitabilityService.calculateSuitability).mockResolvedValue(mockSuitability as any);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/strategy/suitability?assetId=US_AAPL&symbol=AAPL&signalId=momentum&asOf=2026-07-05&universeId=SP500_SAMPLE"
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("real_time"); // Maps computed to real_time
    expect(body.value.adjustedLabel).toBe("strong_watch");
    expect(body.value.suitabilityScore).toBe(85);
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(strategySuitabilityService.calculateSuitability).mockRejectedValue(new Error("Computation failed"));

    const response = await GET(
      new NextRequest(
        "http://localhost/api/strategy/suitability?assetId=US_AAPL&symbol=AAPL&signalId=momentum&asOf=2026-07-05&universeId=SP500_SAMPLE"
      )
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.message).toBe("Computation failed");
  });
});
