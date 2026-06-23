import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";
import { NextRequest } from "next/server";
import { updateWatchlistReportStatus } from "@/server/watchlist/watchlist-report-store";

vi.mock("@/server/watchlist/watchlist-report-store", () => ({
  updateWatchlistReportStatus: vi.fn(),
}));

describe("PATCH /api/watchlist/reports/[id]/status", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("should fail (disabled) if write is not enabled", async () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "false";

    const req = new NextRequest("http://localhost/api/watchlist/reports/rep-123/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "read" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "rep-123" }) });
    expect(res.status).toBe(405);
  });

  it("should update status when write is enabled", async () => {
    process.env.LOCAL_SETTINGS_WRITE_ENABLED = "true";
    vi.mocked(updateWatchlistReportStatus).mockResolvedValue({
      id: "rep-123",
      status: "read",
    } as any);

    const req = new NextRequest("http://localhost/api/watchlist/reports/rep-123/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "read" }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "rep-123" }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.value.status).toBe("read");
    expect(updateWatchlistReportStatus).toHaveBeenCalledWith("rep-123", "read");
  });
});
