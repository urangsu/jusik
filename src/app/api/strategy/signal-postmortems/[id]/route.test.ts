import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { getSignalPostmortemById } from "@/server/strategy/signal-postmortem-store";

vi.mock("@/server/strategy/signal-postmortem-store", () => ({
  getSignalPostmortemById: vi.fn(),
}));

describe("GET /api/strategy/signal-postmortems/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 if not found", async () => {
    vi.mocked(getSignalPostmortemById).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/strategy/signal-postmortems/pm-1");
    const res = await GET(req, { params: Promise.resolve({ id: "pm-1" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.status).toBe("not_found");
  });

  it("returns postmortem if found", async () => {
    vi.mocked(getSignalPostmortemById).mockResolvedValue({ id: "pm-1" } as any);

    const req = new NextRequest("http://localhost/api/strategy/signal-postmortems/pm-1");
    const res = await GET(req, { params: Promise.resolve({ id: "pm-1" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("cached");
    expect(json.value.id).toBe("pm-1");
  });
});
