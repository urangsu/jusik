export type ProviderHealthStatus = "healthy" | "degraded" | "disabled" | "rate_limited" | "error";

export type ProviderHealth = {
  providerId: string;
  status: ProviderHealthStatus;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastMessage: string | null;
  latencyMs: number | null;
};
