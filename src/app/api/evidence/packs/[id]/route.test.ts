import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/server/evidence/evidence-pack-store", () => ({
  getEvidencePack: vi.fn(),
}));

import { getEvidencePack } from "@/server/evidence/evidence-pack-store";

describe("GET /api/evidence/packs/[id]", () => {
  it("returns cached pack when found", async () => {
    vi.mocked(getEvidencePack).mockResolvedValue({
      id: "pack_ok",
      subjectType: "asset",
      subjectId: "AAPL",
      evidenceRefs: [],
      asOf: new Date().toISOString(),
      freshness: "fresh",
      claimTypes: ["price"],
      missingEvidence: [],
      blockedActions: [],
      limitations: [],
      createdAt: new Date().toISOString(),
      engineVersion: "1.0.0",
    });

    const req = new NextRequest("http://localhost/api/evidence/packs/pack_ok");
    const res = await GET(req, { params: Promise.resolve({ id: "pack_ok" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.value.id).toBe("pack_ok");
  });

  it("returns not_found status when null is returned", async () => {
    vi.mocked(getEvidencePack).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/evidence/packs/pack_bad");
    const res = await GET(req, { params: Promise.resolve({ id: "pack_bad" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("not_found");
    expect(data.value).toBeNull();
  });
});
