import { ProviderId } from "./provider-id";

export type MaskedSecretValue = {
  configured: boolean;
  maskedValue: string | null;
  updatedAt: string | null;
};

export type ProviderStatus =
  | "disabled"
  | "not_configured"
  | "configured"
  | "unverified"
  | "credentials_missing"
  | "credentials_invalid"
  | "endpoint_mismatch"
  | "token_failed"
  | "rate_limited"
  | "provider_error"
  | "healthy"
  | "invalid_key"
  | "error";

export type ProviderSettingSnapshot = {
  providerId: ProviderId;
  enabled: boolean;
  values: Record<string, string | number | boolean | MaskedSecretValue | null>;
  status: ProviderStatus;
  lastCheckedAt: string | null;
  message: string | null;
};
