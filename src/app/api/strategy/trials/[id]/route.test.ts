import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { getStrategyTrialRecordById } from "@/server/strategy/strategy-trial-store";

vi.mock("@/server/strategy/strategy-trial-store", () => ({
  getStrategyTrialRecordById: vi.fn(),
}));

describe("GET /api/strategy/trials/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 if not found", async () => {
    vi.mocked(getStrategyTrialRecordById).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/strategy/trials/trial-1");
    const res = await GET(req, { params: Promise.resolve({ id: "trial-1" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.status).toBe("not_found");
  });

  it("returns record if found", async () => {
    vi.mocked(getStrategyTrialRecordById).mockResolvedValue({ id: "trial-1" } as any);

    const req = new NextRequest("http://localhost/api/strategy/trials/trial-1");
    const res = await GET(req, { params: Promise.resolve({ id: "trial-1" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value.id).toBe("trial-1");
  });
});
