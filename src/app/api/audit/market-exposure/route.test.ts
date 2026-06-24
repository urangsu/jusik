import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { getMarketExposureResultByTrial } from "@/server/audit/market-exposure-store";

vi.mock("@/server/audit/market-exposure-store", () => ({
  getMarketExposureResultByTrial: vi.fn(),
}));

describe("GET /api/audit/market-exposure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if trialId is missing", async () => {
    const req = new NextRequest("http://localhost/api/audit/market-exposure");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
  });

  it("should return not_found if no result is saved", async () => {
    vi.mocked(getMarketExposureResultByTrial).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/audit/market-exposure?trialId=trial-1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("not_found");
    expect(json.value).toBeNull();
  });

  it("should return cached result if it exists", async () => {
    vi.mocked(getMarketExposureResultByTrial).mockResolvedValue({
      id: "audit-1",
      trialId: "trial-1",
      beta: 1.1,
    } as any);

    const req = new NextRequest("http://localhost/api/audit/market-exposure?trialId=trial-1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value.id).toBe("audit-1");
    expect(json.value.beta).toBe(1.1);
  });
});
