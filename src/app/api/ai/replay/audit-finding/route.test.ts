import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import { runAiExplanationReplay } from "@/server/ai/ai-explanation-replay-runner";

vi.mock("@/server/ai/ai-explanation-replay-runner", () => ({
  runAiExplanationReplay: vi.fn(),
}));

describe("POST /api/ai/replay/audit-finding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRunResult = {
    records: [{ id: "rep_1", passed: true }],
    passed: true,
    failureCount: 0,
  };

  it("should fail with 400 when body findingId is missing", async () => {
    const req = new NextRequest("http://localhost/api/ai/replay/audit-finding", {
      method: "POST",
      body: JSON.stringify({ locale: "ko" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.message).toContain("findingId는 필수 항목입니다.");
  });

  it("should run replay and return outcome with cached status when passed", async () => {
    vi.mocked(runAiExplanationReplay).mockResolvedValue(mockRunResult as any);

    const req = new NextRequest("http://localhost/api/ai/replay/audit-finding", {
      method: "POST",
      body: JSON.stringify({ findingId: "finding_123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.sourceTier).toBe("manual_import");
    expect(json.value.passed).toBe(true);
  });

  it("should return 404 when finding is not found in service", async () => {
    vi.mocked(runAiExplanationReplay).mockRejectedValue(new Error("Audit finding 'finding_123' not found."));

    const req = new NextRequest("http://localhost/api/ai/replay/audit-finding", {
      method: "POST",
      body: JSON.stringify({ findingId: "finding_123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.status).toBe("not_found");
  });
});
