import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { createGuardedMockAiOutput } from "@/server/ai/guarded-ai-output-service";

vi.mock("@/server/ai/guarded-ai-output-service", () => ({
  createGuardedMockAiOutput: vi.fn(),
}));

describe("POST /api/ai/mock-output/audit-finding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSafeResult = {
    request: { id: "req_1", requestHash: "hash_123", status: "cached" },
    promptInput: { id: "prompt_1" },
    output: { id: "out_1", isBlocked: false, blockReasons: [] },
    cacheRecord: {},
    blockedRecord: null,
  };

  const mockBlockedResult = {
    request: { id: "req_1", requestHash: "hash_123", status: "blocked" },
    promptInput: { id: "prompt_1" },
    output: { id: "out_1", isBlocked: true, blockReasons: ["금지 단어가 포함되어 있습니다."] },
    cacheRecord: null,
    blockedRecord: {},
  };

  it("should fail with 400 when body findingId is missing", async () => {
    const req = new NextRequest("http://localhost/api/ai/mock-output/audit-finding", {
      method: "POST",
      body: JSON.stringify({ locale: "ko", mode: "safe" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("findingId는 필수 항목입니다.");
  });

  it("should return cached status when output is not blocked", async () => {
    vi.mocked(createGuardedMockAiOutput).mockResolvedValue(mockSafeResult as any);

    const req = new NextRequest("http://localhost/api/ai/mock-output/audit-finding", {
      method: "POST",
      body: JSON.stringify({ findingId: "finding_123", mode: "safe" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.sourceTier).toBe("manual_import");
    expect(json.value.output.isBlocked).toBe(false);
  });

  it("should return error status when output is blocked", async () => {
    vi.mocked(createGuardedMockAiOutput).mockResolvedValue(mockBlockedResult as any);

    const req = new NextRequest("http://localhost/api/ai/mock-output/audit-finding", {
      method: "POST",
      body: JSON.stringify({ findingId: "finding_123", mode: "forbidden_wording" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.value.output.isBlocked).toBe(true);
  });

  it("should return 404 when finding is not found in service", async () => {
    vi.mocked(createGuardedMockAiOutput).mockRejectedValue(new Error("Audit finding 'finding_123' not found."));

    const req = new NextRequest("http://localhost/api/ai/mock-output/audit-finding", {
      method: "POST",
      body: JSON.stringify({ findingId: "finding_123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.status).toBe("not_found");
  });
});
