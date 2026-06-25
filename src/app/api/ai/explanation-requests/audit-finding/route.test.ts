import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { createAuditFindingExplanationRequest } from "@/server/ai/ai-explanation-request-service";

vi.mock("@/server/ai/ai-explanation-request-service", () => ({
  createAuditFindingExplanationRequest: vi.fn(),
}));

describe("POST /api/ai/explanation-requests/audit-finding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockServiceResult = {
    request: {
      id: "req_1",
      requestHash: "hash_123",
      status: "pending",
    },
    promptInput: {
      id: "prompt_1",
    },
    cached: null,
  };

  it("should fail with 400 when body findingId is missing", async () => {
    const req = new NextRequest("http://localhost/api/ai/explanation-requests/audit-finding", {
      method: "POST",
      body: JSON.stringify({ locale: "ko" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("findingId는 필수 항목입니다.");
  });

  it("should call service and return result on valid body", async () => {
    vi.mocked(createAuditFindingExplanationRequest).mockResolvedValue(mockServiceResult as any);

    const req = new NextRequest("http://localhost/api/ai/explanation-requests/audit-finding", {
      method: "POST",
      body: JSON.stringify({ findingId: "finding_123", locale: "ko" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("real_time");
    expect(json.sourceTier).toBe("manual_import");
    expect(json.value.request.id).toBe("req_1");
  });

  it("should return 404 when finding is not found in service", async () => {
    vi.mocked(createAuditFindingExplanationRequest).mockRejectedValue(new Error("Audit finding 'finding_123' not found."));

    const req = new NextRequest("http://localhost/api/ai/explanation-requests/audit-finding", {
      method: "POST",
      body: JSON.stringify({ findingId: "finding_123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.status).toBe("not_found");
  });
});
