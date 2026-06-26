import type { AiPromptInput } from "./ai-prompt-input";
import type { StructuredAiOutput } from "./structured-ai-output";

export type AiProviderId =
  | "mock"
  | "disabled_openai"
  | "disabled_anthropic"
  | "disabled_gemini"
  | "disabled_local";

export type AiProviderKind =
  | "mock"
  | "external_disabled"
  | "local_disabled";

export type AiProviderStatus =
  | "available"
  | "disabled"
  | "not_configured"
  | "not_supported"
  | "error";

export type AiProviderCapability =
  | "structured_output"
  | "audit_finding_explanation"
  | "strategy_trial_explanation"
  | "filing_explanation";

export type AiProviderDescriptor = {
  id: AiProviderId;
  kind: AiProviderKind;
  displayName: string;

  status: AiProviderStatus;
  capabilities: AiProviderCapability[];

  supportsStreaming: false;
  requiresApiKey: boolean;

  disabledReason: string | null;
  policyWarnings: string[];
};

export type AiProviderRequest = {
  providerId: AiProviderId;
  promptInput: AiPromptInput;
  requestHash: string;

  locale: "ko" | "en";
  createdAt: string;
};

export type AiProviderResult = {
  providerId: AiProviderId;
  status: AiProviderStatus;

  output: StructuredAiOutput | null;

  errorCode: string | null;
  message: string | null;

  warnings: string[];
  createdAt: string;
};
