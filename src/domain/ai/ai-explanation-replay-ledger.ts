import type { AiPromptInput } from "./ai-prompt-input";
import type { StructuredAiOutput } from "./structured-ai-output";
import type {
  AiExplanationRequest,
  AiExplanationCacheRecord,
  AiExplanationBlockedRecord,
} from "./ai-explanation-request";

export type AiReplayOutcome = "passed" | "blocked" | "error";

export type AiReplayMode = "safe" | "forbidden_wording" | "ungrounded_claim" | "missing_disclaimer";

export type AiExplanationReplayRecord = {
  id: string;

  requestHash: string;
  findingId: string;

  mode: AiReplayMode;
  outcome: AiReplayOutcome;

  request: AiExplanationRequest;
  promptInput: AiPromptInput;
  output: StructuredAiOutput;

  cacheRecord: AiExplanationCacheRecord | null;
  blockedRecord: AiExplanationBlockedRecord | null;

  expectedBlocked: boolean;
  actualBlocked: boolean;

  passed: boolean;
  failureReasons: string[];

  createdAt: string;
  engineVersion: string;
};
