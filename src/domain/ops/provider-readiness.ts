export type RuntimeProviderId =
  | "kis"
  | "opendart"
  | "fmp_free"
  | "finnhub_free"
  | "alpha_vantage_free"
  | "yfinance_personal"
  | "stooq_personal";

export type ProviderReadinessStatus =
  | "ready"
  | "not_configured"
  | "disabled_by_policy"
  | "personal_fallback_disabled"
  | "api_required"
  | "error";

/**
 * Result of checking a single provider's configuration readiness.
 * Key VALUES are never included. Only key names are reported.
 */
export type ProviderReadinessCheck = {
  providerId: RuntimeProviderId;
  displayName: string;

  requiredKeys: string[];
  configuredKeys: string[];
  missingKeys: string[];

  /** Always false — key values are never exposed */
  secretsExposed: false;

  status: ProviderReadinessStatus;
  message: string | null;

  canRunSmoke: boolean;
  checkedAt: string;
};

export type ProviderRealDataSmokeCapability =
  | "quote"
  | "ohlcv"
  | "filings"
  | "financials"
  | "news";

export type ProviderRealDataSmokeResult = {
  providerId: RuntimeProviderId;
  capability: ProviderRealDataSmokeCapability;

  symbol: string | null;
  region: "KR" | "US" | null;

  attempted: boolean;
  skippedReason: string | null;

  envelopeStatus: string | null;
  dataAvailable: boolean;
  source: string | null;
  sourceTier: string | null;
  warnings: string[];
  updatedAt: string | null;
  message: string | null;

  passed: boolean;
  checkedAt: string;
};

export type ProviderReadinessReport = {
  id: string;
  readiness: ProviderReadinessCheck[];
  smokeResults: ProviderRealDataSmokeResult[];

  readyCount: number;
  notConfiguredCount: number;
  failureCount: number;

  createdAt: string;
};
