/**
 * scripts/audit/audit-individual-signal-ic.ts
 *
 * CLI 도구: 개별 atomic signal IC를 계산하고 콘솔에 출력한다.
 *
 * 사용:
 *   npm run audit:individual-signal-ic -- --universe KOSPI_SAMPLE
 *   npm run audit:individual-signal-ic -- --universe SP500_SAMPLE
 */

import { auditIndividualSignalIc } from "../../src/server/audit/individual-signal-ic-auditor";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = (value ?? process.argv[process.argv.indexOf(arg) + 1] ?? "true");
    }
  }
  // Support --universe VALUE (space-separated)
  const universeIdx = process.argv.indexOf("--universe");
  if (universeIdx !== -1 && process.argv[universeIdx + 1]) {
    args["universe"] = process.argv[universeIdx + 1];
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const universeId = (args.universe ?? "KOSPI_SAMPLE") as
    | "KOSPI_SAMPLE"
    | "SP500_SAMPLE";

  console.log(`[audit:individual-signal-ic] 개별 신호 IC 감사 시작 — ${universeId}`);
  console.log(
    "주의: 이 결과는 기능 검증 목적이며 투자 판단에 사용할 수 없습니다.\n"
  );

  const results = await auditIndividualSignalIc({ universeId });

  console.log(
    `${"신호 ID".padEnd(28)} ${"Horizon".padEnd(5)} ${"n".padEnd(6)} ${"IC".padEnd(8)} ${"ICIR".padEnd(8)} ${"HitRate".padEnd(9)} ${"평가"}`
  );
  console.log("-".repeat(90));

  for (const r of results) {
    console.log(
      `${r.signalId.padEnd(28)} ${r.horizon.padEnd(5)} ${String(r.sampleSize).padEnd(6)} ${(r.spearmanIc?.toFixed(4) ?? "null").padEnd(8)} ${(r.icir?.toFixed(4) ?? "null").padEnd(8)} ${(r.hitRate?.toFixed(4) ?? "null").padEnd(9)} ${r.contributionAssessment}${r.warning ? ` ⚠ ${r.warning}` : ""}`
    );
  }

  const negative = results.filter((r) => r.contributionAssessment === "negative");
  if (negative.length > 0) {
    console.warn(`\n[경고] IC 음수 신호: ${negative.map((r) => r.signalId).join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
