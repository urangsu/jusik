import { vi, describe, it, expect, beforeEach } from "vitest";
import { dailyReportGenerator } from "./daily-report-generator";
import { dailyReportContextBuilder } from "./daily-report-context-builder";
import { dailyReportStore } from "./daily-report-store";

vi.mock("./daily-report-context-builder", () => {
  return {
    dailyReportContextBuilder: {
      buildContext: vi.fn(),
    },
  };
});

vi.mock("./daily-report-store", () => {
  return {
    dailyReportStore: {
      addReport: vi.fn(),
    },
  };
});

describe("DailyReportGenerator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DAILY_REPORT_ENABLED = "true";
  });

  it("should generate report successfully on trading day", async () => {
    const mockContext = {
      reportDate: "2026-06-17",
      kospiSnapshot: {
        universeId: "KOSPI_SAMPLE",
        generatedAt: "2026-06-17T09:00:00Z",
        sourceSummary: [
          { providerId: "kis", status: "real_time", tier: "official", warnings: [], updatedAt: null },
        ],
        tiles: [{ assetId: "KR:005930", changePercent: 1.5 }],
        tableRows: [],
        warnings: [],
      },
      sp500Snapshot: {
        universeId: "SP500_SAMPLE",
        generatedAt: "2026-06-17T09:00:00Z",
        sourceSummary: [],
        tiles: [],
        tableRows: [],
        warnings: [],
      },
      events: [],
      budgets: [{ providerId: "kis", used: 10 }],
      healths: {},
      isTradingDay: true,
    };

    (dailyReportContextBuilder.buildContext as any).mockResolvedValue(mockContext);

    const report = await dailyReportGenerator.generate({
      reportDate: "2026-06-17",
      locale: "ko",
    });

    expect(report.status).toBe("generated");
    expect(report.sections.length).toBeGreaterThanOrEqual(5);
    expect(dailyReportStore.addReport).toHaveBeenCalledWith(report);
  });

  it("should skip report generation on non-trading days", async () => {
    const mockContext = {
      isTradingDay: false,
      budgets: [],
      healths: {},
      events: [],
      kospiSnapshot: { sourceSummary: [] },
      sp500Snapshot: { sourceSummary: [] },
    };

    (dailyReportContextBuilder.buildContext as any).mockResolvedValue(mockContext);

    const report = await dailyReportGenerator.generate({
      reportDate: "2026-06-20",
      locale: "ko",
    });

    expect(report.status).toBe("skipped_non_trading_day");
    expect(report.sections.length).toBe(0);
  });

  it("should mark report as partial if api call limit is exceeded", async () => {
    const mockContext = {
      reportDate: "2026-06-17",
      kospiSnapshot: {
        universeId: "KOSPI_SAMPLE",
        generatedAt: "2026-06-17T09:00:00Z",
        sourceSummary: [
          { providerId: "kis", status: "real_time", tier: "official", warnings: [], updatedAt: null },
        ],
        tiles: [],
        tableRows: [],
        warnings: [],
      },
      sp500Snapshot: {
        universeId: "SP500_SAMPLE",
        generatedAt: "2026-06-17T09:00:00Z",
        sourceSummary: [],
        tiles: [],
        tableRows: [],
        warnings: [],
      },
      events: [],
      budgets: [{ providerId: "kis", used: 350 }],
      healths: {},
      isTradingDay: true,
    };

    (dailyReportContextBuilder.buildContext as any).mockResolvedValue(mockContext);

    const report = await dailyReportGenerator.generate({
      reportDate: "2026-06-17",
      locale: "ko",
    });

    expect(report.status).toBe("partial");
    const skippedSecs = report.sections.filter((s) => s.skipped);
    expect(skippedSecs.length).toBeGreaterThan(0);
    expect(skippedSecs[0].content).toContain("비용 제한");
  });
});
