import { describe, it, expect } from "vitest";
import { dailyReportIntegrityChecker } from "./daily-report-integrity-checker";
import { DailyReport } from "@/domain/reports/daily-report";

describe("DailyReportIntegrityChecker", () => {
  const validReport: DailyReport = {
    id: "rep-123",
    reportDate: "2026-06-17",
    locale: "ko",
    status: "generated",
    generatedAt: new Date().toISOString(),
    marketDate: "2026-06-17",
    sections: [
      { id: "market-summary", title: "시장 요약", content: "종합 요약 내용", order: 1 },
      { id: "market-board-summary", title: "마켓 보드", content: "마켓 보드 내용", order: 2 },
      { id: "volatility-anomaly", title: "변동성 이상", content: "해당 없음", order: 3 },
      { id: "volume-anomaly", title: "거래량 이상", content: "해당 없음", order: 4 },
      { id: "gap-anomaly", title: "갭 상승", content: "해당 없음", order: 5 },
      { id: "provider-status", title: "제공자 상태", content: "제공자 상태 내용", order: 6 },
    ],
    sourceSummary: [
      { providerId: "kis", status: "real_time", sourceTier: "official", warnings: [], updatedAt: null },
    ],
    alertEventIds: [],
    dataQualityWarnings: [],
    costSummary: {
      apiCalls: 10,
      apiCost: 0,
      llmCalls: 0,
      llmCost: 0,
      runtimeMinutes: 0.2,
    },
    integrity: { passed: true, checkedAt: "", errors: [], warnings: [] },
  };

  it("should pass a fully valid report", () => {
    const result = dailyReportIntegrityChecker.check(validReport);
    expect(result.passed).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("should fail if generatedAt is missing", () => {
    const invalid = { ...validReport, generatedAt: "" };
    const result = dailyReportIntegrityChecker.check(invalid);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain("Missing generatedAt timestamp.");
  });

  it("should fail if sections count is less than 5", () => {
    const invalid = { ...validReport, sections: validReport.sections.slice(0, 4) };
    const result = dailyReportIntegrityChecker.check(invalid);
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain("Minimum is 5");
  });

  it("should fail if personal fallback is used but warning is missing from sections", () => {
    const fallbackReport = {
      ...validReport,
      sourceSummary: [
        {
          providerId: "yfinance_personal",
          status: "stale",
          sourceTier: "personal_fallback",
          warnings: [],
          updatedAt: null,
        },
      ],
    };

    const result = dailyReportIntegrityChecker.check(fallbackReport);
    expect(result.passed).toBe(false);
    expect(result.errors).toContain(
      "Report utilizes personal fallback data but lacks the required data quality warning."
    );
  });

  it("should pass if personal fallback is used and warning is present in sections", () => {
    const fallbackReport = {
      ...validReport,
      sourceSummary: [
        {
          providerId: "yfinance_personal",
          status: "stale",
          sourceTier: "personal_fallback",
          warnings: [],
          updatedAt: null,
        },
      ],
      sections: [
        ...validReport.sections,
        {
          id: "data-quality-warnings",
          title: "데이터 품질 경고",
          content: "주의: 이 리포트는 일부 종목에 대해 개인용 비공식 fallback 데이터를 사용했습니다.",
          order: 7,
        },
      ],
    };

    const result = dailyReportIntegrityChecker.check(fallbackReport);
    expect(result.passed).toBe(true);
  });

  it("should fail if an anomaly section is empty (lacks '해당 없음' or similar)", () => {
    const invalid = {
      ...validReport,
      sections: validReport.sections.map((s) => {
        if (s.id === "volatility-anomaly") {
          return { ...s, content: " " }; // empty
        }
        return s;
      }),
    };

    const result = dailyReportIntegrityChecker.check(invalid);
    expect(result.passed).toBe(false);
    expect(result.errors[0]).toContain("content cannot be empty. Must show '해당 없음' or 'None'");
  });
});
