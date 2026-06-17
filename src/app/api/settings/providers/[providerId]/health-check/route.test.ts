import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { checkProviderHealth } from "../../../../../../server/settings/provider-health-checker";

vi.mock("../../../../../../server/settings/provider-health-checker", () => ({
  checkProviderHealth: vi.fn(),
}));

describe("POST /api/settings/providers/[providerId]/health-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST triggers health check and returns updated snapshot", async () => {
    vi.mocked(checkProviderHealth).mockResolvedValue({
      providerId: "opendart",
      enabled: true,
      values: {},
      status: "healthy",
      lastCheckedAt: "2026-06-18",
      message: "정상적으로 연결되었습니다.",
    });

    const req = new NextRequest("http://localhost/api/settings/providers/opendart/health-check", {
      method: "POST",
    });
    
    const res = await POST(req, { params: Promise.resolve({ providerId: "opendart" }) });
    expect(res.status).toBe(200);
    expect(checkProviderHealth).toHaveBeenCalledWith("opendart");
    const json = await res.json();
    expect(json.value.status).toBe("healthy");
  });
});
