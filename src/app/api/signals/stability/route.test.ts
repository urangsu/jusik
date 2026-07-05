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
  it("returns 400 when assetId is missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/signals/stability?signalId=momentum_ichimoku")
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.value).toBeNull();
    expect(body.message).toContain("Missing required parameters");
  });

  it("returns 200 with stability envelope on success", async () => {
    const mockStability = {
      assetId: "US_AAPL",
      signalId: "momentum_ichimoku",
      date: "2026-07-05",
      consecutiveObservations: 5,
      flipCount30d: 0,
      rankAutocorrelation: 0.8,
      status: "passed" as const,
      actionableThresholdMet: true,
      warnings: [],
    };
    vi.mocked(signalStabilityService.getStability).mockResolvedValue(mockStability);

    const response = await GET(
      new NextRequest("http://localhost/api/signals/stability?assetId=US_AAPL&signalId=momentum_ichimoku&date=2026-07-05")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("cached");
    expect(body.value.consecutiveObservations).toBe(5);
    expect(body.value.actionableThresholdMet).toBe(true);
  });

  it("returns 500 when service throws", async () => {
    vi.mocked(signalStabilityService.getStability).mockRejectedValue(new Error("Database offline"));

    const response = await GET(
      new NextRequest("http://localhost/api/signals/stability?assetId=US_AAPL&signalId=momentum_ichimoku")
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.status).toBe("error");
    expect(body.message).toBe("Database offline");
  });
});
