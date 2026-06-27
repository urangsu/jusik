import { describe, it, expect } from "vitest";
import { buildDiagnosticDebate } from "./diagnostic-debate-builder";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";
import type { ReportSection } from "@/domain/report/report-section";

describe("diagnostic-debate-builder", () => {
  const dummyPack: EvidencePack = {
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
  };

  const dummySections: ReportSection[] = [
    {
      id: "sec_test_technical",
      type: "technical",
      title: "Technical Trends",
      summary: "Stable price action.",
      evidencePackIds: ["pack_test"],
      claimSourceIds: [],
      confidence: "high",
      limitations: [],
      warnings: [],
      createdAt: new Date().toISOString(),
    },
  ];

  it("should create debate report with 4 deterministic cases", () => {
    const debate = buildDiagnosticDebate({
      evidencePacks: [dummyPack],
      sections: dummySections,
    });

    expect(debate.cases).toHaveLength(4);
    const bull = debate.cases.find((c) => c.type === "bull_case");
    expect(bull).toBeDefined();
    expect(bull!.strength).toBe("medium"); // because technical is present
  });

  it("should check and block debate report on policy wording violation", () => {
    const violatingSections: ReportSection[] = [
      {
        ...dummySections[0],
        summary: "이 종목 매수 추천 확정, 100% 수익 보장합니다.",
      },
    ];

    const debate = buildDiagnosticDebate({
      evidencePacks: [dummyPack],
      sections: violatingSections,
    });

    expect(debate.isBlocked).toBe(true);
    expect(debate.blockedTerms).toContain("추천");
    expect(debate.blockedTerms).toContain("매수");
    expect(debate.blockedTerms).toContain("수익 보장");
  });
});
