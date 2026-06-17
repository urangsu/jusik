#!/usr/bin/env tsx
/**
 * Calculate Signal Reliability CLI
 * 
 * 사용법:
 *   npm run reliability:calculate -- --universe KOSPI_SAMPLE
 *   npm run reliability:calculate -- --universe SP500_SAMPLE
 * 
 * 주의: 이 결과는 기능 검증용 통계입니다. 투자 조언 또는 실운용 성과 보장이 아닙니다.
 */

import { calculateSignalReliability } from "@/server/reliability/reliability-engine";

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

  console.log("=".repeat(60));
  console.log("[Reliability CLI] 신호 신뢰도 및 가중치 학습 연산 수행");
  console.log(`  Universe: ${universe}`);
  console.log(`  시작 시간: ${new Date().toLocaleString()}`);
  console.log("=".repeat(60));

  try {
    const summary = await calculateSignalReliability({ universeId: universe });

    console.log("\n[연산 완료 요약]");
    console.log(`  총 분석 레코드 수: ${summary.records.length}`);
    console.log(`  Robust 신호 수:   ${summary.aggregate.robustSignals}`);
    console.log(`  표본 부족 신호 수: ${summary.aggregate.insufficientSampleSignals}`);
    console.log(`  Negative IC 신호 수: ${summary.aggregate.negativeIcSignals}`);
    console.log(`  비공식 Fallback 영향 수: ${summary.aggregate.personalFallbackAffectedSignals}`);
    console.log(`  적용된 경고 필터:   ${summary.warnings.join(", ") || "없음"}`);
    
    console.log(`\n최종 데이터 저장: data/reliability/${universe}.latest.json`);
    console.log("=".repeat(60));
    console.log("주의: 이 지표는 과거 백테스트 OOS 기반의 통계 정보이며, 투자 판단 도구가 아닙니다.");
  } catch (err) {
    console.error("[Reliability CLI] 연산 중 오류 발생:", err);
    process.exit(1);
  }
}

main();
