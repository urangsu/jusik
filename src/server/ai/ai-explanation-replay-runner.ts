import { createGuardedMockAiOutput } from "./guarded-ai-output-service";
import { saveAiExplanationReplayRecord } from "./ai-explanation-replay-ledger-store";
import { GOLDEN_EXPLANATION_CASES } from "./goldens/ai-explanation-golden-cases";
import type {
  AiExplanationReplayRecord,
  AiReplayMode,
  AiReplayOutcome,
} from "@/domain/ai/ai-explanation-replay-ledger";

export async function runAiExplanationReplay(input: {
  findingId: string;
  modes?: AiReplayMode[];
  locale?: "ko" | "en";
  userPrompt?: string | null;
}): Promise<{
  records: AiExplanationReplayRecord[];
  passed: boolean;
  failureCount: number;
}> {
  const modes = input.modes || ["safe", "forbidden_wording", "ungrounded_claim", "missing_disclaimer"];
  const records: AiExplanationReplayRecord[] = [];
  let failureCount = 0;

  for (const mode of modes) {
    const expectedBlocked = mode !== "safe";

    try {
      const runResult = await createGuardedMockAiOutput({
        findingId: input.findingId,
        locale: input.locale,
        userPrompt: input.userPrompt,
        mode,
      });

      const actualBlocked = runResult.output.isBlocked;
      const failureReasons: string[] = [];

      // Mismatch check
      if (actualBlocked !== expectedBlocked) {
        failureReasons.push(
          `Mode '${mode}' validation mismatch. Expected blocked = ${expectedBlocked}, but actual = ${actualBlocked}`
        );
      }

      // Check golden cases detailed constraints if defined
      const goldenCase = GOLDEN_EXPLANATION_CASES.find((c) => c.mode === mode);
      if (goldenCase && actualBlocked) {
        // Validate blocked terms
        if (goldenCase.expectedBlockedTerms) {
          const hasAnyBlockedTerm = runResult.output.blockedTerms.some((term) =>
            goldenCase.expectedBlockedTerms?.includes(term)
          );
          if (!hasAnyBlockedTerm && runResult.output.blockedTerms.length === 0) {
            failureReasons.push(`Expected forbidden terms but none were detected.`);
          }
        }
        // Validate block reasons
        if (goldenCase.expectedBlockReasonIncludes) {
          for (const reqInclude of goldenCase.expectedBlockReasonIncludes) {
            const hasReason = runResult.output.blockReasons.some((r) => r.includes(reqInclude));
            if (!hasReason) {
              failureReasons.push(`Block reason missing keyword: '${reqInclude}'`);
            }
          }
        }
      }

      const passed = failureReasons.length === 0;
      if (!passed) {
        failureCount++;
      }

      const outcome: AiReplayOutcome = passed ? (actualBlocked ? "blocked" : "passed") : "error";

      const replayRecord: AiExplanationReplayRecord = {
        id: `rep_${input.findingId}_${mode}_${Date.now()}`,
        requestHash: runResult.request.requestHash,
        findingId: input.findingId,
        mode,
        outcome,
        request: runResult.request,
        promptInput: runResult.promptInput,
        output: runResult.output,
        cacheRecord: runResult.cacheRecord,
        blockedRecord: runResult.blockedRecord,
        expectedBlocked,
        actualBlocked,
        passed,
        failureReasons,
        createdAt: new Date().toISOString(),
        engineVersion: runResult.output.engineVersion,
      };

      await saveAiExplanationReplayRecord(replayRecord);
      records.push(replayRecord);
    } catch (err: any) {
      failureCount++;
      const replayRecord: AiExplanationReplayRecord = {
        id: `rep_err_${input.findingId}_${mode}_${Date.now()}`,
        requestHash: "error",
        findingId: input.findingId,
        mode,
        outcome: "error",
        request: { status: "error" } as any,
        promptInput: {} as any,
        output: { isBlocked: true, blockReasons: [err.message] } as any,
        cacheRecord: null,
        blockedRecord: null,
        expectedBlocked,
        actualBlocked: true,
        passed: false,
        failureReasons: [`Execution error: ${err.message}`],
        createdAt: new Date().toISOString(),
        engineVersion: "1.0.0-error",
      };
      records.push(replayRecord);
    }
  }

  return {
    records,
    passed: failureCount === 0,
    failureCount,
  };
}
