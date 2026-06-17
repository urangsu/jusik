import { ProviderId } from "./provider-id";

export type MaskedSecretValue = {
  configured: boolean;
  maskedValue: string | null;
  updatedAt: string | null;
};

export type ProviderSettingSnapshot = {
  providerId: ProviderId;
  enabled: boolean;
  values: Record<string, string | number | boolean | MaskedSecretValue | null>;
  status:
    | "not_configured"
    | "configured"
    | "healthy"
    | "invalid_key"
    | "rate_limited"
    | "error";
  lastCheckedAt: string | null;
  message: string | null;
};
