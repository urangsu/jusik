import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { checkJobRouteEnabled } from "../../../../server/security/job-route-guard";
import { syncRecentDisclosures } from "../../../../server/filings/disclosure-sync-service";

vi.mock("../../../../server/security/job-route-guard", () => ({
  checkJobRouteEnabled: vi.fn(),
}));

vi.mock("../../../../server/filings/disclosure-sync-service", () => ({
  syncRecentDisclosures: vi.fn(),
}));

describe("POST /api/opendart/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns guard response if job route is disabled", async () => {
    const mockGuardResponse = new Response("Forbidden", { status: 403 });
    vi.mocked(checkJobRouteEnabled).mockReturnValue(mockGuardResponse);

    const request = new NextRequest("http://localhost/api/opendart/sync", {
      method: "POST",
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(syncRecentDisclosures).not.toHaveBeenCalled();
  });

  it("triggers sync and returns result on success", async () => {
    vi.mocked(checkJobRouteEnabled).mockReturnValue(null as any);
    vi.mocked(syncRecentDisclosures).mockResolvedValue({
      status: "eod",
      source: "OpenDART Sync Service",
      sourceTier: "official",
      warnings: [],
      updatedAt: "2026-06-17",
      value: {
        fetched: 10,
        saved: 5,
        skipped: 5,
        events: [],
      },
    });

    const request = new NextRequest("http://localhost/api/opendart/sync", {
      method: "POST",
      body: JSON.stringify({
        stockCode: "005930",
        beginDate: "20260101",
        endDate: "20260331",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe("eod");
    expect(json.value.fetched).toBe(10);
    expect(syncRecentDisclosures).toHaveBeenCalledWith({
      universeId: undefined,
      stockCode: "005930",
      corpCode: undefined,
      beginDate: "20260101",
      endDate: "20260331",
      disclosureType: undefined,
      finalReportOnly: undefined,
    });
  });
});
