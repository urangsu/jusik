import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listProviderSettings } from "../../../../server/settings/provider-settings-store";

vi.mock("../../../../server/settings/provider-settings-store", () => ({
  listProviderSettings: vi.fn(),
}));

describe("GET /api/settings/providers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the list of settings snapshots", async () => {
    vi.mocked(listProviderSettings).mockResolvedValue([
      {
        providerId: "opendart",
        enabled: true,
        values: {},
        status: "healthy",
        lastCheckedAt: "2026-06-18",
        message: null,
      },
    ]);

    const req = new NextRequest("http://localhost/api/settings/providers");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached"); // safe-api-response defaults to cached/eod
    expect(json.value).toHaveLength(1);
    expect(json.value[0].providerId).toBe("opendart");
  });
});
