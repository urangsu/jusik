import type { DataStatus } from "@/domain/common/data-status";

export type ProviderKeySmokeProvider =
  | "kis"
  | "opendart"
  | "fmp_free"
  | "finnhub_free"
  | "alpha_vantage_free";

export type ProviderKeySmokeTarget = {
  id: string;
  providerId: ProviderKeySmokeProvider;
  capability: "quote" | "ohlcv" | "filings" | "financials" | "provider_health";
  requiresKey: boolean;
};

export type ProviderKeySmokeResult = {
  targetId: string;
  providerId: ProviderKeySmokeProvider;
  capability: ProviderKeySmokeTarget["capability"];
  keyConfigured: boolean;
  status: DataStatus;
  dataAvailable: boolean;
  passed: boolean;
  message: string | null;
};

export type ProviderKeySmokeReport = {
  id: string;
  mode: "without_key" | "with_key" | "auto";
  results: ProviderKeySmokeResult[];
  passed: boolean;
  failureCount: number;
  createdAt: string;
  engineVersion: "provider-key-smoke-v1";
};
