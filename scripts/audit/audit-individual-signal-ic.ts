/**
 * scripts/audit/audit-individual-signal-ic.ts
 *
 * CLI 도구: 개별 atomic signal의 예측력을 검증(Individual Signal IC Audit)한다.
 *
 * 사용:
 *   npm run audit:individual-signal-ic -- --universe=KOSPI_SAMPLE [--signal=momentum_return] [--horizon=1m]
 */

import { auditIndividualSignalIc } from "../../src/server/audit/individual-signal-ic-auditor";
import { saveIndividualSignalIcResults } from "../../src/server/audit/individual-signal-ic-store";

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
  const signal = args.signal || undefined;
  const horizon = args.horizon as "1w" | "1m" | "3m" | undefined;

  console.log("[Individual Signal IC Audit] 시작...");
  console.log(`  Universe: ${universe}`);
  console.log(`  Filter Signal: ${signal || "모두"}`);
  console.log(`  Filter Horizon: ${horizon || "모두"}`);

  try {
    const results = await auditIndividualSignalIc({
      universeId: universe,
      signalId: signal,
      horizon,
    });

    if (results.length === 0) {
      console.log("\n[Individual Signal IC Audit] 감사 대상 신호가 없거나 계산 가능한 데이터가 없습니다.");
      return;
    }

    // Save results to store
    await saveIndividualSignalIcResults(results);

    // CLI Output Table
    console.log("\n------------------------------------------------------------------------------------------------------------------------");
    console.log(
      "Signal ID".padEnd(20) + " | " +
      "Horizon".padEnd(8) + " | " +
      "Sample".padEnd(8) + " | " +
      "IC".padEnd(8) + " | " +
      "ICIR".padEnd(8) + " | " +
      "Hit Rate".padEnd(10) + " | " +
      "Assessment".padEnd(20) + " | " +
      "Warnings"
    );
    console.log("------------------------------------------------------------------------------------------------------------------------");

    for (const r of results) {
      const icStr = r.spearmanIc !== null ? r.spearmanIc.toFixed(4) : "null";
      const icirStr = r.icir !== null ? r.icir.toFixed(4) : "null";
      const hrStr = r.hitRate !== null ? (r.hitRate * 100).toFixed(2) + "%" : "null";
      const weightStr = r.currentWeightInMomentumV1 !== null ? `(w=${r.currentWeightInMomentumV1})` : "";
      
      console.log(
        `${r.signalId} ${weightStr}`.padEnd(20) + " | " +
        r.horizon.padEnd(8) + " | " +
        String(r.sampleSize).padEnd(8) + " | " +
        icStr.padEnd(8) + " | " +
        icirStr.padEnd(8) + " | " +
        hrStr.padEnd(10) + " | " +
        r.contributionAssessment.padEnd(20) + " | " +
        r.warnings.join(", ")
      );
    }
    console.log("------------------------------------------------------------------------------------------------------------------------");
    console.log("\n[Individual Signal IC Audit] 완료 및 저장되었습니다.");
    console.log("  저장위치: data/audits/individual-signal-ic/latest.json");

  } catch (error) {
    console.error("\n[Individual Signal IC Audit] 계산 중 에러 발생:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
