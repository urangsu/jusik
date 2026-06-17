#!/usr/bin/env tsx
/**
 * Signal Consistency Check CLI
 * 
 * 사용법:
 *   npm run backtest:consistency -- --universe KOSPI_SAMPLE
 *   npm run backtest:consistency -- --universe SP500_SAMPLE --strict
 */

import { checkTechnicalSignalConsistency } from "@/server/backtest/signal-consistency-checker";

function parseArgs(): {
  universe: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  strict: boolean;
} {
  const args = process.argv.slice(2);
  let universe: "KOSPI_SAMPLE" | "SP500_SAMPLE" = "KOSPI_SAMPLE";
  let strict = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--universe" && args[i + 1]) {
      if (args[i + 1] === "SP500_SAMPLE") universe = "SP500_SAMPLE";
    }
    if (args[i] === "--strict") strict = true;
  }

  return { universe, strict };
}

async function main() {
  const { universe, strict } = parseArgs();

  console.log("=".repeat(60));
  console.log("[Consistency Check] 신호 재현성 검증");
  console.log(`  Universe: ${universe}`);
  console.log(`  Strict:   ${strict}`);
  console.log("=".repeat(60));

  try {
    const report = await checkTechnicalSignalConsistency({ universeId: universe, strict });

    console.log("\n[결과]");
    console.log(`  전체 자산:          ${report.totalAssets}`);
    console.log(`  일관성 통과:        ${report.consistentAssets}`);
    console.log(`  불일치 감지:        ${report.inconsistentAssets}`);
    console.log(`  데이터 없음:        ${report.missingDataAssets}`);
    console.log(`  이상 있음:          ${report.hasInconsistency ? "있음" : "없음"}`);

    if (report.inconsistentAssets > 0) {
      console.log("\n[불일치 항목]");
      for (const r of report.assetResults.filter((a) => !a.consistent)) {
        console.log(
          `  ${r.symbol}: stored=${r.stored}, recomputed=${r.recomputed}, delta=${r.delta}`
        );
      }
    }
  } catch (err) {
    console.error("[Consistency Check] 오류:", err);
    process.exit(1);
  }
}

main();
