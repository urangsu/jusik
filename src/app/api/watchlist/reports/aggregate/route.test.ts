import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { aggregateWatchlistReports } from "@/server/watchlist/watchlist-report-aggregator";

vi.mock("@/server/watchlist/watchlist-report-aggregator", () => ({
  aggregateWatchlistReports: vi.fn(),
}));

describe("POST /api/watchlist/reports/aggregate", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("should fail (disabled) if write is not enabled", async () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "false";

    const req = new NextRequest("http://localhost/api/watchlist/reports/aggregate", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(405);
  });

  it("should aggregate reports when write is enabled", async () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "true";
    vi.mocked(aggregateWatchlistReports).mockResolvedValue({
      created: 3,
      skippedDuplicate: 2,
      items: [],
    });

    const req = new NextRequest("http://localhost/api/watchlist/reports/aggregate", {
      method: "POST",
      body: JSON.stringify({ assetId: "KR:005930" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.value.created).toBe(3);
    expect(json.value.skippedDuplicate).toBe(2);
    expect(aggregateWatchlistReports).toHaveBeenCalledWith(
      expect.objectContaining({
        assetId: "KR:005930",
      })
    );
  });
});
