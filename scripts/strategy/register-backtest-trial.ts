#!/usr/bin/env tsx
/**
 * scripts/strategy/register-backtest-trial.ts
 * 
 * 사용법:
 *   npm run strategy:trial:from-backtest -- --backtest data/backtest/<runId>.json
 */

import fs from "fs";
import path from "path";
import { createStrategyTrialFromBacktest } from "@/server/strategy/backtest-to-strategy-trial";
import { createSignalPostmortemsFromBacktest } from "@/server/strategy/backtest-to-signal-postmortem";
import { saveStrategyTrialRecord } from "@/server/strategy/strategy-trial-store";
import { saveSignalPostmortem } from "@/server/strategy/signal-postmortem-store";

async function main() {
  const args = process.argv.slice(2);
  let backtestPath = "";
  let variant = "baseline";
  let thesis = "";
  let hypothesis = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--backtest" && args[i + 1]) {
      backtestPath = args[i + 1];
    } else if (args[i] === "--variant" && args[i + 1]) {
      variant = args[i + 1];
    } else if (args[i] === "--thesis" && args[i + 1]) {
      thesis = args[i + 1];
    } else if (args[i] === "--hypothesis" && args[i + 1]) {
      hypothesis = args[i + 1];
    }
  }

  if (!backtestPath) {
    console.error("오류: --backtest <경로> 지정이 필요합니다.");
    console.error("예: npm run strategy:trial:from-backtest -- --backtest data/backtest/oqlo95jl.json");
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), backtestPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`오류: 파일을 찾을 수 없습니다: ${resolvedPath}`);
    process.exit(1);
  }

  try {
    const raw = fs.readFileSync(resolvedPath, "utf8");
    const result = JSON.parse(raw);

    const trial = createStrategyTrialFromBacktest({
      result,
      variantId: variant,
      thesisKo: thesis || undefined,
      hypothesis: hypothesis || undefined,
      sourceBacktestResultPath: backtestPath,
    });

    await saveStrategyTrialRecord(trial);

    const postmortems = createSignalPostmortemsFromBacktest({
      result,
      trialId: trial.id,
    });

    for (const pm of postmortems) {
      await saveSignalPostmortem(pm);
    }

    console.log("=".repeat(60));
    console.log("[Strategy Trial Registration] 전략 연구 기록 등록 완료");
    console.log("=".repeat(60));
    console.log(`Trial ID:             ${trial.id}`);
    console.log(`Strategy:             ${trial.strategyId}`);
    console.log(`Universe:             ${trial.universeId}`);
    console.log(`Variant:              ${trial.variantId}`);
    console.log(`Validation Status:    ${trial.validationStatus}`);
    console.log(`Validity Level:       ${trial.validityLevel || "N/A"}`);
    console.log(`Bias Warnings:        ${trial.biasWarnings.join(", ") || "없음"}`);
    console.log(`Postmortems Created:  ${postmortems.length}`);
    console.log(`Failed Positions:     ${trial.postmortemSummary.failedPositionCount}`);
    console.log(`Missing Price Positions: ${trial.postmortemSummary.missingPricePositionCount}`);
    console.log(`Source Backtest:      ${backtestPath}`);
    console.log("\nSaved files:");
    console.log(`- data/strategy-trials/by-id/${trial.id}.json`);
    console.log(`- data/signal-postmortems/by-id/ (contains ${postmortems.length} files)`);
    console.log("=".repeat(60));
    console.log("\n주의: 이 결과는 전략 연구용이며 투자 조언이 아닙니다.");
    console.log("=".repeat(60));
  } catch (err: any) {
    console.error("전략 연구 기록 등록 실패:", err.message || err);
    process.exit(1);
  }
}

main();
