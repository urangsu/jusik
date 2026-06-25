/**
 * scripts/audit/audit-findings.ts
 *
 * CLI 도구: 개별 감사 지표들을 취합하고 요약 Finding을 생성하여 저장한다.
 *
 * 사용:
 *   npm run audit:findings
 */

import { aggregateAuditFindings } from "../../src/server/audit/audit-finding-aggregator";

async function main() {
  console.log("[Audit Findings Aggregation] 감사 Finding 갱신 시작...");

  try {
    const { createdOrUpdated, findings } = await aggregateAuditFindings();

    console.log(`\n총 ${findings.length}개의 감사 Finding이 최신화되었습니다. (신규/변경: ${createdOrUpdated}개)`);

    if (findings.length === 0) {
      console.log("활성화된 감사 경고나 Finding이 존재하지 않습니다.");
      return;
    }

    // CLI Output Table
    console.log("\n---------------------------------------------------------------------------------------------------------------------------------------------");
    console.log(
      "Severity".padEnd(10) + " | " +
      "Scope".padEnd(12) + " | " +
      "Source Type".padEnd(22) + " | " +
      "Title".padEnd(35) + " | " +
      "Universe".padEnd(14) + " | " +
      "Strategy".padEnd(14) + " | " +
      "Signal".padEnd(20) + " | " +
      "Warnings"
    );
    console.log("---------------------------------------------------------------------------------------------------------------------------------------------");

    for (const f of findings) {
      const sevStr = f.severity;
      const scopeStr = f.scope;
      const srcStr = f.sourceType;
      const titleStr = f.title.slice(0, 35);
      const univStr = f.universeId || "-";
      const stratStr = f.strategyId || "-";
      const sigStr = f.signalId || "-";
      const warnStr = f.warnings.join(", ");

      console.log(
        sevStr.padEnd(10) + " | " +
        scopeStr.padEnd(12) + " | " +
        srcStr.padEnd(22) + " | " +
        titleStr.padEnd(35) + " | " +
        univStr.padEnd(14) + " | " +
        stratStr.padEnd(14) + " | " +
        sigStr.padEnd(20) + " | " +
        warnStr
      );
    }
    console.log("---------------------------------------------------------------------------------------------------------------------------------------------");
    console.log("\n[Audit Findings Aggregation] 완료되었습니다.");
    console.log("  저장위치: data/audits/findings/latest.json");

  } catch (error) {
    console.error("\n[Audit Findings Aggregation] 실행 중 에러 발생:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
