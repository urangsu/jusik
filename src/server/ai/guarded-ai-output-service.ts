import { createAuditFindingExplanationRequest } from "./ai-explanation-request-service";
import { createMockStructuredAiOutput } from "./mock-ai-output-adapter";
import { validateStructuredAiOutput } from "./structured-output-validator";
import {
  saveAiExplanationCacheRecord,
  saveAiExplanationBlockedRecord,
} from "./ai-explanation-cache-store";
import type {
  AiExplanationRequest,
  AiExplanationCacheRecord,
  AiExplanationBlockedRecord,
} from "@/domain/ai/ai-explanation-request";
import type { AiPromptInput } from "@/domain/ai/ai-prompt-input";
import type { StructuredAiOutput } from "@/domain/ai/structured-ai-output";

export async function createGuardedMockAiOutput(input: {
  findingId: string;
  locale?: "ko" | "en";
  userPrompt?: string | null;
  mode?: "safe" | "forbidden_wording" | "ungrounded_claim" | "missing_disclaimer";
}): Promise<{
  request: AiExplanationRequest;
  promptInput: AiPromptInput;
  output: StructuredAiOutput;
  cacheRecord: AiExplanationCacheRecord | null;
  blockedRecord: AiExplanationBlockedRecord | null;
}> {
  // 1. Call createAuditFindingExplanationRequest to build request contract
  const { request, promptInput } = await createAuditFindingExplanationRequest({
    findingId: input.findingId,
    locale: input.locale,
    userPrompt: input.userPrompt,
  });

  // 2. Generate mock structured output based on promptInput and mode
  const rawOutput = createMockStructuredAiOutput({
    promptInput,
    mode: input.mode || "safe",
  });

  // 3. Run validation
  const validatedOutput = validateStructuredAiOutput(rawOutput);

  let cacheRecord: AiExplanationCacheRecord | null = null;
  let blockedRecord: AiExplanationBlockedRecord | null = null;

  const now = new Date().toISOString();

  // 4/5. Save record depending on block status
  if (validatedOutput.isBlocked) {
    blockedRecord = {
      requestHash: request.requestHash,
      request,
      attemptedOutput: validatedOutput,
      blockReasons: validatedOutput.blockReasons,
      blockedTerms: validatedOutput.blockedTerms,
      blockedAt: now,
      engineVersion: validatedOutput.engineVersion,
    };
    await saveAiExplanationBlockedRecord(blockedRecord);
    request.status = "blocked";
  } else {
    cacheRecord = {
      requestHash: request.requestHash,
      request,
      output: validatedOutput,
      cachedAt: now,
      expiresAt: null,
      engineVersion: validatedOutput.engineVersion,
    };
    await saveAiExplanationCacheRecord(cacheRecord);
    request.status = "cached";
  }

  return {
    request,
    promptInput,
    output: validatedOutput,
    cacheRecord,
    blockedRecord,
  };
}
