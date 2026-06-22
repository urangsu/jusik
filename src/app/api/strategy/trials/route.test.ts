import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listStrategyTrialRecords } from "@/server/strategy/strategy-trial-store";

vi.mock("@/server/strategy/strategy-trial-store", () => ({
  listStrategyTrialRecords: vi.fn(),
}));

describe("GET /api/strategy/trials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list trials and filter them", async () => {
    vi.mocked(listStrategyTrialRecords).mockResolvedValue([
      { id: "trial-1" } as any,
    ]);

    const req = new NextRequest("http://localhost/api/strategy/trials?strategyId=momentum_v1_long_only");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value).toHaveLength(1);
    expect(json.value[0].id).toBe("trial-1");
  });
});
