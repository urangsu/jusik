import { describe, expect, it } from "vitest";
import { buildEvidencePackFromDataEnvelope } from "./evidence-pack-from-data-envelope";

describe("buildEvidencePackFromDataEnvelope", () => {
  it("preserves source metadata for a valid envelope", () => {
    const pack = buildEvidencePackFromDataEnvelope({
      envelope: {
        value: { price: 100 },
        status: "delayed",
        source: "fmp_free",
        sourceTier: "free_limited",
        warnings: ["license_review_required"],
        updatedAt: "2026-07-02T00:00:00.000Z",
      },
      subjectType: "asset",
      subjectId: "US:AAPL",
      sourceType: "market_quote",
      sourceId: "fmp_free:US:AAPL:quote",
      claimType: "price",
      createdAt: "2026-07-02T00:01:00.000Z",
    });

    expect(pack.evidenceRefs[0].source).toBe("fmp_free");
    expect(pack.evidenceRefs[0].sourceTier).toBe("free_limited");
    expect(pack.missingEvidence).toHaveLength(0);
    expect(pack.blockedActions).toHaveLength(0);
    expect(pack.freshness).toBe("fresh");
  });

  it("marks api_required as missing evidence and blocked action", () => {
    const pack = buildEvidencePackFromDataEnvelope({
      envelope: {
        value: null,
        status: "api_required",
        source: "KIS",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: "KIS key required.",
      },
      subjectType: "asset",
      subjectId: "KR:005930",
      sourceType: "market_quote",
      sourceId: "kis:KR:005930:quote",
      claimType: "price",
      createdAt: "2026-07-02T00:01:00.000Z",
    });

    expect(pack.missingEvidence).toContain("market_quote:kis:KR:005930:quote");
    expect(pack.blockedActions).toContain("provider_api_required");
    expect(pack.limitations).toContain("KIS key required.");
    expect(pack.freshness).toBe("unknown");
  });
});
