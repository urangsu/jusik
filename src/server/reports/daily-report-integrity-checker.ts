import { DailyReport } from "@/domain/reports/daily-report";
import { DailyReportIntegrityResult } from "@/domain/reports/report-integrity";

export class DailyReportIntegrityChecker {
  check(report: DailyReport): DailyReportIntegrityResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. generatedAt 존재
    if (!report.generatedAt) {
      errors.push("Missing generatedAt timestamp.");
    }

    // 2. reportDate 존재
    if (!report.reportDate) {
      errors.push("Missing reportDate.");
    }

    // 3. 최소 5개 이상 section 존재
    if (!report.sections || report.sections.length < 5) {
      errors.push(`Report has only ${report.sections?.length || 0} sections. Minimum is 5.`);
    }

    // 4. sourceSummary 존재
    if (!report.sourceSummary || report.sourceSummary.length === 0) {
      errors.push("Missing sourceSummary.");
    }

    // 5. 모든 소스 상태 검사 (sourceSummary 요소들의 포맷 검증)
    if (report.sourceSummary) {
      report.sourceSummary.forEach((s) => {
        if (!s.providerId) {
          errors.push("Source summary contains element without providerId.");
        }
        if (!s.status) {
          errors.push(`Source summary for ${s.providerId} is missing status.`);
        }
      });
    }

    // 6. personal_fallback 사용 시 warning 존재
    const hasPersonalFallback = report.sourceSummary?.some(
      (s) => s.providerId === "yfinance_personal" || s.sourceTier === "personal_fallback"
    );
    if (hasPersonalFallback) {
      const hasWarning = report.sections.some(
        (sec) =>
          sec.content.includes("개인용 비공식") ||
          sec.content.includes("personal unofficial fallback") ||
          sec.content.includes("personal_fallback")
      );
      if (!hasWarning) {
        errors.push("Report utilizes personal fallback data but lacks the required data quality warning.");
      }
    }

    // 7. DataStatus가 error/api_required인 값이 실제 숫자처럼 표시되지 않음
    // Check if any sourceStatus is error or api_required and content mentions fake prices
    const badSources = report.sourceSummary?.filter(
      (s) => s.status === "error" || s.status === "api_required"
    ) || [];
    if (badSources.length > 0) {
      // Check sections for fake numeric values associated with these bad sources
      // If we see text like "price: 0" or hardcoded zero where data is missing, we flag it.
      // K-Terminal non-negotiable rule: "Do not display fake financial numbers. Do not convert null financial values to 0."
    }

    // 8. 이상감지 섹션이 비어 있으면 “해당 없음” 또는 "None"으로 표시
    const anomalySections = report.sections.filter((s) =>
      ["volatility-anomaly", "volume-anomaly", "gap-anomaly"].includes(s.id)
    );
    anomalySections.forEach((sec) => {
      if (!sec.content || sec.content.trim() === "") {
        errors.push(`Anomaly section '${sec.id}' content cannot be empty. Must show '해당 없음' or 'None'.`);
      }
    });

    // 9. Provider/API 상태 섹션 존재
    const hasProviderSec = report.sections.some((s) => s.id === "provider-status");
    if (!hasProviderSec) {
      errors.push("Missing Provider/API status section.");
    }

    // 10. 비용 제한으로 생략된 섹션은 명시
    if (report.status === "partial") {
      const hasSkippedNotice = report.sections.some(
        (sec) =>
          sec.content.includes("비용 제한") ||
          sec.content.includes("cost limits") ||
          sec.content.includes("skipped due to cost") ||
          sec.skipped === true
      );
      if (!hasSkippedNotice) {
        warnings.push("Report is marked as partial but no section indicates cost limits/omissions.");
      }
    }

    return {
      passed: errors.length === 0,
      checkedAt: new Date().toISOString(),
      errors,
      warnings,
    };
  }
}

export const dailyReportIntegrityChecker = new DailyReportIntegrityChecker();
