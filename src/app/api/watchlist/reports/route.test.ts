import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listWatchlistReportItems } from "@/server/watchlist/watchlist-report-store";

vi.mock("@/server/watchlist/watchlist-report-store", () => ({
  listWatchlistReportItems: vi.fn(),
}));

describe("Reports API - GET /api/watchlist/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return report list in DataEnvelope", async () => {
    vi.mocked(listWatchlistReportItems).mockResolvedValue([
      { id: "rep-1", title: "Test Report" } as any,
    ]);

    const req = new NextRequest("http://localhost/api/watchlist/reports?status=unread");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.value).toHaveLength(1);
    expect(json.value[0].title).toBe("Test Report");
    expect(json.status).toBe("cached");
    expect(listWatchlistReportItems).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "unread",
      })
    );
  });
});
