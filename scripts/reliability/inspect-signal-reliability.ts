#!/usr/bin/env tsx
/**
 * Inspect Signal Reliability CLI
 * 
 * 사용법:
 *   npm run reliability:inspect -- --universe KOSPI_SAMPLE
 *   npm run reliability:inspect -- --universe SP500_SAMPLE
 */

import { getLatestReliabilitySummary } from "@/server/reliability/reliability-store";

function parseArgs(): { universe: "KOSPI_SAMPLE" | "SP500_SAMPLE" } {
  const args = process.argv.slice(2);
  let universe: "KOSPI_SAMPLE" | "SP500_SAMPLE" = "KOSPI_SAMPLE";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--universe" && args[i + 1]) {
      const u = args[i + 1];
      if (u === "SP500_SAMPLE") {
        universe = "SP500_SAMPLE";
      } else {
        universe = "KOSPI_SAMPLE";
      }
    }
  }

  return { universe };
}

async function main() {
  const { universe } = parseArgs();
  const summary = await getLatestReliabilitySummary(universe);

  if (!summary) {
    console.log(`[Reliability Inspect] No calculated summary found for universe ${universe}.`);
    console.log("Please run calculations first:");
    console.log(`  npm run reliability:calculate -- --universe ${universe}`);
    return;
  }

  console.log("=".repeat(85));
  console.log(`[Reliability View] 신호 신뢰도 과거 검증 지표 조회 (Universe: ${universe})`);
  console.log(`  계산 시점: ${new Date(summary.calculatedAt).toLocaleString()}`);
  console.log("=".repeat(85));
  console.log(
    "Signal".padEnd(23) + " | " +
    "Hz".padEnd(4) + " | " +
    "Size".padEnd(5) + " | " +
    "IC".padEnd(7) + " | " +
    "ICIR".padEnd(7) + " | " +
    "HitRate".padEnd(7) + " | " +
    "Score".padEnd(5) + " | " +
    "Multiplier".padEnd(10)
  );
  console.log("-".repeat(85));

  for (const r of summary.records) {
    const signalName = r.signalId.replace("momentum_", "");
    const horizon = r.horizon;
    const size = String(r.sampleSize).padStart(4);
    const ic = r.spearmanIcMean !== null ? r.spearmanIcMean.toFixed(4) : "N/A";
    const icir = r.icir !== null ? r.icir.toFixed(4) : "N/A";
    const hitRate = r.hitRate !== null ? (r.hitRate * 100).toFixed(1) + "%" : "N/A";
    const score = r.reliabilityScore !== null ? String(r.reliabilityScore) : "N/A";
    const mult = r.weightMultiplier !== null ? r.weightMultiplier.toFixed(3) : "N/A";

    console.log(
      signalName.padEnd(23) + " | " +
      horizon.padEnd(4) + " | " +
      size.padEnd(5) + " | " +
      ic.padStart(7) + " | " +
      icir.padStart(7) + " | " +
      hitRate.padStart(7) + " | " +
      score.padStart(5) + " | " +
      mult.padStart(10)
    );
  }

  console.log("=".repeat(85));
  console.log("주의: 이 지표는 과거 백테스트 OOS 기반의 통계 정보이며, 투자 판단 도구가 아닙니다.");
}

main();
