import { DailyReport, DailyReportStatus } from "@/domain/reports/daily-report";
import { AlertEvent } from "@/domain/alerts/alert-event";
import { dailyReportContextBuilder } from "./daily-report-context-builder";
import { dailyReportRenderer } from "./daily-report-renderer";
import { dailyReportIntegrityChecker } from "./daily-report-integrity-checker";
import { dailyReportStore } from "./daily-report-store";
import { alertEventStore } from "../alerts/alert-event-store";
import { notificationHub } from "../notifications/notification-hub";

export class DailyReportGenerator {
  async generate(params: {
    reportDate: string;
    locale: "ko" | "en";
    force?: boolean;
  }): Promise<DailyReport> {
    const startTime = Date.now();
    const { reportDate, locale, force = false } = params;

    const isEnabled = process.env.DAILY_REPORT_ENABLED !== "false";
    if (!isEnabled) {
      throw new Error("Daily report generation is disabled in settings.");
    }

    const context = await dailyReportContextBuilder.buildContext(reportDate, force);

    const isLlmEnabled = process.env.DAILY_REPORT_USE_LLM === "true";
    const maxApiCalls = process.env.DAILY_REPORT_MAX_API_CALLS 
      ? parseInt(process.env.DAILY_REPORT_MAX_API_CALLS, 10) 
      : 300;

    // Sum total API calls across budgets
    const totalApiCalls = context.budgets.reduce((sum, b) => sum + b.used, 0);

    let status: DailyReportStatus = "generated";
    const integrityResult = { passed: true, checkedAt: new Date().toISOString(), errors: [] as string[], warnings: [] as string[] };

    // 1. Non-trading day skipping
    if (!context.isTradingDay) {
      const skippedReport: DailyReport = {
        id: `rep-${Math.random().toString(36).substr(2, 9)}`,
        reportDate,
        locale,
        status: "skipped_non_trading_day",
        generatedAt: new Date().toISOString(),
        marketDate: null,
        sections: [],
        sourceSummary: [],
        alertEventIds: [],
        dataQualityWarnings: [],
        costSummary: {
          apiCalls: 0,
          apiCost: 0,
          llmCalls: 0,
          llmCost: 0,
          runtimeMinutes: 0,
        },
        integrity: integrityResult,
      };

      await dailyReportStore.addReport(skippedReport);
      return skippedReport;
    }

    // 2. Cost limit cap check
    let sections = dailyReportRenderer.renderSections(context, locale);
    if (totalApiCalls > maxApiCalls) {
      status = "partial";
      // Mark sections skipped or limited
      sections = sections.map((s) => {
        if (s.order > 5) {
          return {
            ...s,
            content: locale === "ko" 
              ? "비용 제한으로 인해 이 섹션의 생성을 생략했습니다." 
              : "This section was skipped due to cost limits.",
            skipped: true,
            skipReason: "cost_limit_exceeded",
          };
        }
        return s;
      });
    }

    const elapsedMs = Date.now() - startTime;
    const runtimeMinutes = elapsedMs / (1000 * 60);

    // Map source summary from snapshots
    const sourceSummaryMap: Record<string, any> = {};
    context.kospiSnapshot.sourceSummary.forEach((s) => {
      sourceSummaryMap[s.providerId] = {
        providerId: s.providerId,
        status: s.status,
        sourceTier: s.tier,
        warnings: s.warnings,
      };
    });
    context.sp500Snapshot.sourceSummary.forEach((s) => {
      sourceSummaryMap[s.providerId] = {
        providerId: s.providerId,
        status: s.status,
        sourceTier: s.tier,
        warnings: s.warnings,
      };
    });

    const sourceSummary = Object.values(sourceSummaryMap);

    const report: DailyReport = {
      id: `rep-${Math.random().toString(36).substr(2, 9)}`,
      reportDate,
      locale,
      status,
      generatedAt: new Date().toISOString(),
      marketDate: context.kospiSnapshot.generatedAt || reportDate,
      sections,
      sourceSummary,
      alertEventIds: context.events.map((e) => e.id),
      dataQualityWarnings: [
        ...(context.kospiSnapshot.warnings || []),
        ...(context.sp500Snapshot.warnings || []),
      ],
      costSummary: {
        apiCalls: totalApiCalls,
        apiCost: 0,
        llmCalls: isLlmEnabled ? 1 : 0,
        llmCost: 0,
        runtimeMinutes,
      },
      integrity: integrityResult,
    };

    // 3. Integrity checking
    const checkerResult = dailyReportIntegrityChecker.check(report);
    report.integrity = checkerResult;

    if (!checkerResult.passed) {
      report.status = "failed_integrity_check";
      // Trigger system error alert
      await this.triggerSystemErrorAlert(
        `Daily report integrity check failed: ${checkerResult.errors.join("; ")}`
      );
    }

    await dailyReportStore.addReport(report);
    return report;
  }

  private async triggerSystemErrorAlert(message: string): Promise<void> {
    const event: AlertEvent = {
      id: `evt-sys-${Math.random().toString(36).substr(2, 9)}`,
      ruleType: "data_quality",
      severity: "critical",
      titleKo: "[시스템 오류] 일일 리포트 무결성 검증 실패",
      titleEn: "[System Error] Daily Report Integrity Verification Failed",
      messageKo: `일일 리포트 생성 중 무결성 검증에 실패했습니다. 상세 내용: ${message}`,
      messageEn: `Daily report generation failed integrity verification. Details: ${message}`,
      dataStatus: "error",
      source: "DailyReportGenerator",
      sourceTier: "official",
      warnings: [],
      dedupeKey: `sys:integrity:failed:${Math.random().toString(36).substr(2, 9)}`,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      readAt: null,
      dismissedAt: null,
    };
    await alertEventStore.addEvent(event);
    await notificationHub.dispatchNotification(event);
  }
}

export const dailyReportGenerator = new DailyReportGenerator();
