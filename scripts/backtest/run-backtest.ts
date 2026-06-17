#!/usr/bin/env tsx
/**
 * Backtest CLI
 * 
 * 사용법:
 *   npm run backtest:run -- --universe KOSPI_SAMPLE --strategy momentum_v1
 *   npm run backtest:run -- --universe SP500_SAMPLE
 * 
 * 주의: 이 스크립트는 기능 검증용 백테스트를 실행한다.
 *       투자 조언 또는 운용 성과 검증 목적으로 사용하지 않는다.
 */

import { runPriceOnlyBacktest } from "@/server/backtest/backtest-engine";
import { saveBacktestResult } from "@/server/backtest/backtest-result-store";
import { BacktestStrategy } from "@/domain/backtest/backtest-run";

function parseArgs(): {
  universe: "KOSPI_SAMPLE" | "SP500_SAMPLE";
  strategy: BacktestStrategy;
} {
  const args = process.argv.slice(2);
  let universe: "KOSPI_SAMPLE" | "SP500_SAMPLE" = "KOSPI_SAMPLE";
  let strategy: BacktestStrategy = "momentum_v1_long_only";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--universe" && args[i + 1]) {
      const u = args[i + 1];
      if (u === "SP500_SAMPLE") universe = "SP500_SAMPLE";
      else universe = "KOSPI_SAMPLE";
    }
    if (args[i] === "--strategy" && args[i + 1]) {
      strategy = "momentum_v1_long_only";
    }
  }

  return { universe, strategy };
}

async function main() {
  const { universe, strategy } = parseArgs();
  const runId = Math.random().toString(36).substring(2, 10);

  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  const startDate = new Date(new Date().setFullYear(now.getFullYear() - 1))
    .toISOString()
    .split("T")[0];

  console.log("=".repeat(60));
  console.log("[Backtest CLI] 기능 검증용 백테스트 (투자 조언 아님)");
  console.log(`  Universe: ${universe}`);
  console.log(`  Strategy: ${strategy}`);
  console.log(`  Period:   ${startDate} ~ ${endDate}`);
  console.log(`  Run ID:   ${runId}`);
  console.log("=".repeat(60));

  try {
    const result = await runPriceOnlyBacktest({
      runId,
      strategy,
      universeId: universe,
      startDate,
      endDate,
    });

    await saveBacktestResult(result);

    console.log("\n[결과 요약]");
    console.log(`  상태:             ${result.status}`);
    console.log(`  OOS 구간 수:      ${result.oosSummaries.length}`);
    console.log(`  IC 평균:          ${result.aggregated.icMean ?? "N/A"}`);
    console.log(`  ICIR:             ${result.aggregated.icir ?? "N/A"}`);
    console.log(`  Hit Rate 평균:    ${result.aggregated.hitRateMean ?? "N/A"}`);
    console.log(`  총 수익률:        ${result.aggregated.totalReturn ?? "N/A"}`);
    console.log(`  최대 낙폭:        ${result.aggregated.maxDrawdown ?? "N/A"}`);
    console.log(`  데이터 품질:      ${result.dataQualityScore}%`);
    console.log(`  거부 사유:        ${result.vetoReasons.join(", ") || "없음"}`);
    console.log(`  경고:             ${result.warnings.join(", ")}`);
    console.log("\n[OOS 구간별]");
    for (const s of result.oosSummaries) {
      console.log(
        `  [${s.windowIndex}] ${s.testStart}~${s.testEnd} ` +
          `IC=${s.ic ?? "N/A"} Hit=${s.hitRate ?? "N/A"} ` +
          `Return=${s.longOnlyReturn ?? "N/A"} N=${s.nAssets}`
      );
    }

    console.log("\n[경고]");
    console.log("  이 결과는 기능 검증용 시뮬레이션입니다.");
    console.log("  미조정 가격 기준이며, 투자 조언이 아닙니다.");
    console.log(`\n결과 저장: data/backtest/${runId}.json`);
  } catch (err) {
    console.error("[Backtest CLI] 오류:", err);
    process.exit(1);
  }
}

main();
