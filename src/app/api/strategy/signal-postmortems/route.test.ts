import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { listSignalPostmortems } from "@/server/strategy/signal-postmortem-store";

vi.mock("@/server/strategy/signal-postmortem-store", () => ({
  listSignalPostmortems: vi.fn(),
}));

describe("GET /api/strategy/signal-postmortems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list postmortems and filter them", async () => {
    vi.mocked(listSignalPostmortems).mockResolvedValue([
      { id: "postmortem-1" } as any,
    ]);

    const req = new NextRequest("http://localhost/api/strategy/signal-postmortems?trialId=trial-1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value).toHaveLength(1);
    expect(json.value[0].id).toBe("postmortem-1");
  });
});
