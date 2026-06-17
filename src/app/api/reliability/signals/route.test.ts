import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { getLatestReliabilitySummary } from "../../../../server/reliability/reliability-store";

vi.mock("../../../../server/reliability/reliability-store", () => ({
  getLatestReliabilitySummary: vi.fn(),
}));

describe("GET /api/reliability/signals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns bad request if universe is invalid", async () => {
    const request = new NextRequest("http://localhost/api/reliability/signals?universe=INVALID");
    const response = await GET(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.status).toBe("not_supported");
  });

  it("returns 404 not found if no summary is available", async () => {
    vi.mocked(getLatestReliabilitySummary).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/reliability/signals?universe=KOSPI_SAMPLE");
    const response = await GET(request);
    expect(response.status).toBe(404);

    const json = await response.json();
    expect(json.status).toBe("not_found");
  });

  it("returns 200 and filtered data if summary exists", async () => {
    const mockSummary: any = {
      universeId: "KOSPI_SAMPLE",
      calculatedAt: "2026-06-17T12:00:00Z",
      records: [
        { signalId: "momentum_return", horizon: "1m", weightMultiplier: 1.2 },
        { signalId: "momentum_return", horizon: "1w", weightMultiplier: 1.1 },
        { signalId: "momentum_ma_slope", horizon: "1m", weightMultiplier: 0.9 },
      ],
      warnings: ["unofficial"],
    };

    vi.mocked(getLatestReliabilitySummary).mockResolvedValue(mockSummary);

    const request = new NextRequest("http://localhost/api/reliability/signals?universe=KOSPI_SAMPLE&horizon=1m");
    const response = await GET(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe("cached");
    expect(json.value.length).toBe(2); // momentum_return (1m), momentum_ma_slope (1m)
  });
});
