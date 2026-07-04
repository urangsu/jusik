import type { AiProviderId } from "./ai-provider";

export type AiProviderDryRunResult = {
  providerId: AiProviderId;
  allowed: boolean;
  blockedByPolicy: boolean;
  wouldCallExternalProvider: false;
  tokenEstimate: number;
  sourceRefCount: number;
  missingSourceRefs: boolean;
  warnings: string[];
  message: string | null;
  checkedAt: string;
};
