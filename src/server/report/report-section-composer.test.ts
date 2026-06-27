import { describe, it, expect } from "vitest";
import { composeReportSectionsFromEvidencePack } from "./report-section-composer";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";

describe("report-section-composer", () => {
  const dummyPack: EvidencePack = {
    id: "pack_test",
    subjectType: "asset",
    subjectId: "AAPL",
    evidenceRefs: [
      {
        id: "ref_1",
        sourceType: "market_quote",
        sourceId: "quote_1",
        source: "KIS",
        sourceTier: "official",
        status: "real_time",
        updatedAt: new Date().toISOString(),
        warnings: [],
      },
    ],
    asOf: new Date().toISOString(),
    freshness: "fresh",
    claimTypes: ["price"],
    missingEvidence: [],
    blockedActions: [],
    limitations: [],
    createdAt: new Date().toISOString(),
    engineVersion: "1.0.0",
  };

  it("should compose sections from EvidencePack claim types", () => {
    const sections = composeReportSectionsFromEvidencePack({ evidencePack: dummyPack });
    expect(sections).toHaveLength(1);
    expect(sections[0].type).toBe("technical");
    expect(sections[0].confidence).toBe("high");
  });

  it("should add evidence_gap section when missingEvidence is present", () => {
    const incompletePack: EvidencePack = {
      ...dummyPack,
      missingEvidence: ["opendart_api_key"],
      limitations: ["No corporate filings information."],
    };

    const sections = composeReportSectionsFromEvidencePack({ evidencePack: incompletePack });
    // Should have 1 normal section (technical) + 1 evidence_gap section
    expect(sections).toHaveLength(2);
    const gapSection = sections.find((s) => s.type === "evidence_gap");
    expect(gapSection).toBeDefined();
    expect(gapSection!.confidence).toBe("low");
    expect(gapSection!.summary).toContain("opendart_api_key");
  });
});
