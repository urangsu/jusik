import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listAiExplanationReplayRecords } from "@/server/ai/ai-explanation-replay-ledger-store";

vi.mock("@/server/ai/ai-explanation-replay-ledger-store", () => ({
  listAiExplanationReplayRecords: vi.fn(),
}));

describe("GET /api/ai/replay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call list with correct queries and return records", async () => {
    vi.mocked(listAiExplanationReplayRecords).mockResolvedValue([{ id: "rep_1" } as any]);

    const req = new NextRequest("http://localhost/api/ai/replay?findingId=finding_123&mode=safe&passed=true");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value).toHaveLength(1);
    expect(json.value[0].id).toBe("rep_1");

    expect(listAiExplanationReplayRecords).toHaveBeenCalledWith({
      findingId: "finding_123",
      mode: "safe",
      outcome: undefined,
      passed: true,
    });
  });
});
