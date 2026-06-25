import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listAiExplanationBlockedRecords } from "@/server/ai/ai-explanation-cache-store";

vi.mock("@/server/ai/ai-explanation-cache-store", () => ({
  listAiExplanationBlockedRecords: vi.fn().mockResolvedValue([]),
}));

describe("GET /api/ai/explanation-cache/blocked", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list blocked records and filter by query params", async () => {
    const req = new NextRequest("http://localhost/api/ai/explanation-cache/blocked?sourceType=audit_finding");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.sourceTier).toBe("manual_import");
    expect(listAiExplanationBlockedRecords).toHaveBeenCalledWith({
      sourceType: "audit_finding",
      sourceId: undefined,
      intent: undefined,
    });
  });
});
