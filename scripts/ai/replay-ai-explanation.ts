/**
 * scripts/ai/replay-ai-explanation.ts
 *
 * CLI 도구: AI 설명 validation pipeline을 golden safety suite로 회귀 리플레이 검증한다.
 *
 * 사용:
 *   npm run ai:replay -- --finding=finding_xxx
 */

import { runAiExplanationReplay } from "../../src/server/ai/ai-explanation-replay-runner";

async function main() {
  const args = process.argv.slice(2);
  const findingArg = args.find((arg) => arg.startsWith("--finding="));
  if (!findingArg) {
    console.error("오류: --finding=<findingId> 파라미터가 누락되었습니다.");
    console.log("사용 예: npm run ai:replay -- --finding=finding_xxx");
    process.exit(1);
  }

  const findingId = findingArg.split("=")[1]?.trim();
  if (!findingId) {
    console.error("오류: 유효한 findingId가 지정되지 않았습니다.");
    process.exit(1);
  }

  console.log(`[AI Explanation Replay Ledger] Finding '${findingId}' 리플레이 테스트 시작...`);

  try {
    const result = await runAiExplanationReplay({
      findingId,
      locale: "ko",
    });

    console.log(`\n리플레이 검증 결과: ${result.passed ? "통과 (PASSED)" : "실패 (FAILED)"} (실패 수: ${result.failureCount})`);

    console.log("\n------------------------------------------------------------------------------------------------------------------");
    console.log(
      "Mode".padEnd(20) + " | " +
      "Expected Blocked".padEnd(16) + " | " +
      "Actual Blocked".padEnd(16) + " | " +
      "Outcome".padEnd(12) + " | " +
      "Passed".padEnd(8) + " | " +
      "Failure Reasons"
    );
    console.log("------------------------------------------------------------------------------------------------------------------");

    for (const record of result.records) {
      console.log(
        record.mode.padEnd(20) + " | " +
        String(record.expectedBlocked).padEnd(16) + " | " +
        String(record.actualBlocked).padEnd(16) + " | " +
        record.outcome.padEnd(12) + " | " +
        String(record.passed).padEnd(8) + " | " +
        record.failureReasons.join(", ")
      );
    }
    console.log("------------------------------------------------------------------------------------------------------------------");

    if (!result.passed) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`리플레이 중 심각한 오류 발생: ${err.message}`);
    process.exit(1);
  }
}

main();
