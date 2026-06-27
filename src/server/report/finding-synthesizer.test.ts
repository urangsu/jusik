import { describe, it, expect } from "vitest";
import { synthesizeFindingReport } from "./finding-synthesizer";
import type { ReportSection } from "@/domain/report/report-section";

describe("finding-synthesizer", () => {
  const dummySections: ReportSection[] = [
    {
      id: "sec_1",
      type: "technical",
      title: "Technical Trends",
      summary: "삼성전자 is trading within historical ranges.",
      evidencePackIds: ["pack_1"],
      claimSourceIds: ["ref_1"],
      confidence: "high",
      limitations: [],
      warnings: [],
      createdAt: new Date().toISOString(),
    },
  ];

  it("should synthesize a safe diagnostic report", () => {
    const report = synthesizeFindingReport({
      subjectType: "asset",
      subjectId: "삼성전자",
      sections: dummySections,
    });

    expect(report.isBlocked).toBe(false);
    expect(report.synthesisSummary).toContain("진단 종합 레포트");
    expect(report.blockedTerms).toHaveLength(0);
  });

  it("should block synthesis report if forbidden wording is present in sections", () => {
    const criticalWordingSections: ReportSection[] = [
      {
        ...dummySections[0],
        summary: "이 주식은 상승 확정 강력 추천 매수 지시 대상입니다.",
      },
    ];

    const report = synthesizeFindingReport({
      subjectType: "asset",
      subjectId: "삼성전자",
      sections: criticalWordingSections,
    });

    expect(report.isBlocked).toBe(true);
    expect(report.blockedTerms).toContain("강력 추천");
    expect(report.blockedTerms).toContain("매수");
    expect(report.blockedTerms).toContain("상승 확정");
    expect(report.blockReasons.length).toBeGreaterThan(0);
  });
});
