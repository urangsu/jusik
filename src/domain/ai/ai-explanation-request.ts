import type { AiOutputIntent, AiContextPack, StructuredAiOutput } from "./structured-ai-output";

export type AiExplanationRequestStatus =
  | "pending"
  | "cached"
  | "blocked"
  | "not_supported"
  | "error";

export type AiExplanationRequestSourceType =
  | "audit_finding"
  | "strategy_trial"
  | "watchlist_report"
  | "filing"
  | "provider_health";

export type AiExplanationRequest = {
  id: string;
  requestHash: string;

  intent: AiOutputIntent;
  sourceType: AiExplanationRequestSourceType;
  sourceId: string;

  contextPackId: string;
  contextPack: AiContextPack;

  locale: "ko" | "en";
  userPrompt: string | null;

  status: AiExplanationRequestStatus;

  createdAt: string;
  updatedAt: string;
};

export type AiExplanationCacheRecord = {
  requestHash: string;

  request: AiExplanationRequest;
  output: StructuredAiOutput;

  cachedAt: string;
  expiresAt: string | null;
  engineVersion: string;
};

export type AiExplanationBlockedRecord = {
  requestHash: string;

  request: AiExplanationRequest;
  attemptedOutput: StructuredAiOutput | null;

  blockReasons: string[];
  blockedTerms: string[];

  blockedAt: string;
  engineVersion: string;
};
