import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listAiExplanationCacheRecords } from "@/server/ai/ai-explanation-cache-store";

vi.mock("@/server/ai/ai-explanation-cache-store", () => ({
  listAiExplanationCacheRecords: vi.fn().mockResolvedValue([]),
}));

describe("GET /api/ai/explanation-cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list cache records and filter by query params", async () => {
    const req = new NextRequest("http://localhost/api/ai/explanation-cache?sourceType=audit_finding&sourceId=finding_123");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.sourceTier).toBe("manual_import");
    expect(listAiExplanationCacheRecords).toHaveBeenCalledWith({
      sourceType: "audit_finding",
      sourceId: "finding_123",
      intent: undefined,
    });
  });
});
