import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listWatchlistReportItems } from "@/server/watchlist/watchlist-report-store";

vi.mock("@/server/watchlist/watchlist-report-store", () => ({
  listWatchlistReportItems: vi.fn(),
}));

describe("Unread Count API - GET /api/watchlist/reports/unread-count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate unread, warning, and critical counts correctly", async () => {
    vi.mocked(listWatchlistReportItems).mockResolvedValue([
      { id: "1", severity: "info", detectedAt: "2026-06-20T10:00:00Z" } as any,
      { id: "2", severity: "warning", detectedAt: "2026-06-22T10:00:00Z" } as any,
      { id: "3", severity: "critical", detectedAt: "2026-06-21T10:00:00Z" } as any,
    ]);

    const req = new NextRequest("http://localhost/api/watchlist/reports/unread-count");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.value).toEqual({
      unreadCount: 3,
      warningCount: 1,
      criticalCount: 1,
      latestDetectedAt: "2026-06-22T10:00:00Z",
    });
    expect(json.status).toBe("cached");
    expect(json.sourceTier).toBe("manual_import");
    expect(listWatchlistReportItems).toHaveBeenCalledWith({ status: "unread" });
  });

  it("should return zeros when there are no unread reports", async () => {
    vi.mocked(listWatchlistReportItems).mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/watchlist/reports/unread-count");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.value).toEqual({
      unreadCount: 0,
      warningCount: 0,
      criticalCount: 0,
      latestDetectedAt: null,
    });
  });
});
