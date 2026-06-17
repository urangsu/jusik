import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { checkJobRouteEnabled } from "../../../../server/security/job-route-guard";
import { calculateSignalReliability } from "../../../../server/reliability/reliability-engine";

vi.mock("../../../../server/security/job-route-guard", () => ({
  checkJobRouteEnabled: vi.fn(),
}));

vi.mock("../../../../server/reliability/reliability-engine", () => ({
  calculateSignalReliability: vi.fn(),
}));

describe("POST /api/reliability/calculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns guard response if job route is disabled", async () => {
    const mockGuardResponse = new Response("Forbidden", { status: 403 });
    vi.mocked(checkJobRouteEnabled).mockReturnValue(mockGuardResponse);

    const request = new NextRequest("http://localhost/api/reliability/calculate", {
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(calculateSignalReliability).not.toHaveBeenCalled();
  });

  it("triggers calculation and returns 200 on success", async () => {
    vi.mocked(checkJobRouteEnabled).mockReturnValue(null as any);
    const mockSummary: any = {
      universeId: "KOSPI_SAMPLE",
      calculatedAt: "2026-06-17T12:00:00Z",
      records: [],
      warnings: ["unofficial"],
    };
    vi.mocked(calculateSignalReliability).mockResolvedValue(mockSummary);

    const request = new NextRequest("http://localhost/api/reliability/calculate", {
      method: "POST",
      body: JSON.stringify({ universeId: "KOSPI_SAMPLE" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe("cached");
    expect(calculateSignalReliability).toHaveBeenCalledWith({ universeId: "KOSPI_SAMPLE" });
  });
});
