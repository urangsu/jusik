import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@/server/signals/signal-stability-service", () => ({
  signalStabilityService: {
    getStability: vi.fn(),
  },
}));

import { signalStabilityService } from "@/server/signals/signal-stability-service";

describe("GET /api/signals/stability", () => {
  it("returns 400 when universeId or other parameters are missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/signals/stability?assetId=US:AAPL&signalId=momentum")
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.message).toContain("Missing required parameters");
  });

  it("returns 200 with stability envelope on success", async () => {
    const mockStability = {
      assetId: "US:AAPL",
      signalId: "momentum",
      universeId: "SP500_SAMPLE",
      date: "2026-07-05",
      consecutiveObservations: 4,
      flipCount30d: 1,
      rankAutocorrelation: 0.7,
      status: "passed",
      actionableThresholdMet: true,
      warnings: [],
    };
    vi.mocked(signalStabilityService.getStability).mockResolvedValue(mockStability as any);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/signals/stability?assetId=US:AAPL&signalId=momentum&universeId=SP500_SAMPLE&date=2026-07-05"
      )
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("cached");
    expect(body.value.consecutiveObservations).toBe(4);
    expect(body.value.status).toBe("passed");
  });
});
