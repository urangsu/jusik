import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";

vi.mock("@/server/evidence/evidence-pack-store", () => ({
  listEvidencePacks: vi.fn(),
}));

import { listEvidencePacks } from "@/server/evidence/evidence-pack-store";

describe("GET /api/evidence/packs", () => {
  beforeEach(() => {
    vi.mocked(listEvidencePacks).mockResolvedValue([
      {
        id: "pack_test",
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
      },
    ]);
  });

  it("returns 200 with DataEnvelope of evidence packs", async () => {
    const req = new NextRequest("http://localhost/api/evidence/packs?subjectId=AAPL");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("cached");
    expect(data.sourceTier).toBe("manual_import");
    expect(data.value).toHaveLength(1);
    expect(data.value[0].subjectId).toBe("AAPL");
  });
});
