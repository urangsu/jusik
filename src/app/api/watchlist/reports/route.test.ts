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

  it("should return 400 if status is invalid", async () => {
    const req = new NextRequest("http://localhost/api/watchlist/reports?status=INVALID");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("status");
  });

  it("should return 400 if category is invalid", async () => {
    const req = new NextRequest("http://localhost/api/watchlist/reports?category=INVALID");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 if severity is invalid", async () => {
    const req = new NextRequest("http://localhost/api/watchlist/reports?severity=INVALID");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 if sourceType is invalid", async () => {
    const req = new NextRequest("http://localhost/api/watchlist/reports?sourceType=INVALID");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 if since date is invalid", async () => {
    const req = new NextRequest("http://localhost/api/watchlist/reports?since=not-a-date");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 if includeHidden is invalid", async () => {
    const req = new NextRequest("http://localhost/api/watchlist/reports?includeHidden=maybe");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
