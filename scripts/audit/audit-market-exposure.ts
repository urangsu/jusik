/**
 * scripts/audit/audit-market-exposure.ts
 *
 * CLI 도구: 특정 전략 시도 기록(StrategyTrialRecord)의 시장 노출도를 감사(Market Exposure Audit)한다.
 *
 * 사용:
 *   npm run audit:market-exposure -- --trial=TRIAL_ID
 */

import { auditMarketExposureFromTrial } from "../../src/server/audit/market-exposure-auditor";
import { saveMarketExposureResult } from "../../src/server/audit/market-exposure-store";

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
  const trialId = args.trial;

  if (!trialId) {
    console.error("오류: --trial=<trialId> 인자가 필요합니다.");
    console.log("사용법: npm run audit:market-exposure -- --trial=TRIAL_ID");
    process.exit(1);
  }

  console.log(`[Market Exposure Audit] 시작... (Trial ID: ${trialId})`);

  try {
    const result = await auditMarketExposureFromTrial({ trialId });

    if (result.assessment === "not_available") {
      console.log("\n[Market Exposure Audit] 분석 대상을 찾을 수 없거나 데이터가 부족하여 감사를 수행할 수 없습니다.");
      console.log(`  경고: ${result.warnings.join(", ")}`);
      return;
    }

    // Save result
    await saveMarketExposureResult(result);

    console.log("\n------------------------------------------------------------");
    console.log(`전략 ID             : ${result.strategyId}`);
    console.log(`유니버스 ID         : ${result.universeId}`);
    console.log(`벤치마크 자산       : ${result.benchmarkAssetId ?? "N/A"}`);
    console.log(`표본 수(OOS Windows): ${result.sampleSize}`);
    console.log("------------------------------------------------------------");
    console.log(`Beta                : ${result.beta !== null ? result.beta.toFixed(4) : "null"}`);
    console.log(`벤치마크 상관계수   : ${result.benchmarkCorrelation !== null ? result.benchmarkCorrelation.toFixed(4) : "null"}`);
    console.log(`상승장 평균 수익률  : ${result.upMarketAvgReturn !== null ? (result.upMarketAvgReturn * 100).toFixed(2) + "%" : "null"}`);
    console.log(`하락장 평균 수익률  : ${result.downMarketAvgReturn !== null ? (result.downMarketAvgReturn * 100).toFixed(2) + "%" : "null"}`);
    console.log(`상승장 캡처 비율    : ${result.upCapture !== null ? (result.upCapture * 100).toFixed(2) + "%" : "null"}`);
    console.log(`하락장 캡처 비율    : ${result.downCapture !== null ? (result.downCapture * 100).toFixed(2) + "%" : "null"}`);
    console.log(`평균 초과수익률     : ${result.averageExcessReturn !== null ? (result.averageExcessReturn * 100).toFixed(2) + "%" : "null"}`);
    console.log("------------------------------------------------------------");
    console.log(`시장 중립성 평가    : ${result.assessment}`);
    console.log(`경고                : ${result.warnings.join(", ")}`);
    console.log("------------------------------------------------------------");
    console.log("\n[Market Exposure Audit] 완료 및 저장되었습니다.");
    console.log(`  저장위치: data/audits/market-exposure/by-trial/${result.trialId}.json`);

  } catch (error) {
    console.error("\n[Market Exposure Audit] 감사 중 에러 발생:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
