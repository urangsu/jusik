/**
 * scripts/audit/audit-factor-correlation.ts
 *
 * CLI 도구: 개별 atomic factor/signal 간 상관관계를 감사(Factor Correlation Audit)한다.
 *
 * 사용:
 *   npm run audit:factor-correlation -- --universe=KOSPI_SAMPLE [--method=spearman]
 */

import { auditAllFactorCorrelations } from "../../src/server/audit/factor-correlation-auditor";
import { saveFactorCorrelationResults } from "../../src/server/audit/factor-correlation-store";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value ?? "true";
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();

  const universe = (args.universe ?? "KOSPI_SAMPLE") as "KOSPI_SAMPLE" | "SP500_SAMPLE";
  const method = (args.method ?? "spearman") as "pearson" | "spearman";

  console.log("[Factor Correlation Audit] 시작...");
  console.log(`  Universe: ${universe}`);
  console.log(`  Method: ${method}`);

  try {
    const results = await auditAllFactorCorrelations({
      universeId: universe,
      method,
    });

    if (results.length === 0) {
      console.log("\n[Factor Correlation Audit] 감사 대상 팩터가 없거나 계산 가능한 데이터가 없습니다.");
      return;
    }

    // Save results
    await saveFactorCorrelationResults(results);

    // CLI Output Table
    console.log("\n------------------------------------------------------------------------------------------------------------------------");
    console.log(
      "Factor A".padEnd(25) + " | " +
      "Factor B".padEnd(25) + " | " +
      "Method".padEnd(8) + " | " +
      "Sample".padEnd(8) + " | " +
      "Corr".padEnd(8) + " | " +
      "Severity".padEnd(12) + " | " +
      "Warnings"
    );
    console.log("------------------------------------------------------------------------------------------------------------------------");

    for (const r of results) {
      const corrStr = r.correlation !== null ? r.correlation.toFixed(4) : "null";
      
      console.log(
        r.factorA.padEnd(25) + " | " +
        r.factorB.padEnd(25) + " | " +
        r.method.padEnd(8) + " | " +
        String(r.sampleSize).padEnd(8) + " | " +
        corrStr.padEnd(8) + " | " +
        r.severity.padEnd(12) + " | " +
        r.warnings.join(", ")
      );
    }
    console.log("------------------------------------------------------------------------------------------------------------------------");
    console.log("\n[Factor Correlation Audit] 완료 및 저장되었습니다.");
    console.log("  저장위치: data/audits/factor-correlation/latest.json");

  } catch (error) {
    console.error("\n[Factor Correlation Audit] 계산 중 에러 발생:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
