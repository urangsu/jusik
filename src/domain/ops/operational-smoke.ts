export type OperationalSmokeTargetId =
  | "ai_providers"
  | "ai_provider_run_mock"
  | "ai_provider_run_disabled_openai"
  | "market_quote_kr"
  | "market_ohlcv_kr"
  | "opendart_disclosures"
  | "audit_findings"
  | "audit_replay"
  | "watchlist_reports"
  | "provider_health";

export type OperationalSmokeExpectation =
  | "data_available"
  | "api_required_allowed"
  | "not_supported_expected"
  | "empty_allowed"
  | "blocked_expected"
  | "error_unexpected";

export type OperationalSmokeSeverity = "info" | "warning" | "error";

export type OperationalSmokeResult = {
  id: OperationalSmokeTargetId;

  method: "GET" | "POST";
  endpoint: string;

  requiresApiKey: boolean;
  requiresRuntimeData: boolean;
  expectedWithoutKey: OperationalSmokeExpectation;
  expectedWithKey: OperationalSmokeExpectation;

  httpStatus: number | null;
  envelopeStatus: string | null;

  dataAvailable: boolean;
  valueType: string | null;

  source: string | null;
  sourceTier: string | null;
  warnings: string[];
  updatedAt: string | null;

  passed: boolean;
  severity: OperationalSmokeSeverity;
  message: string | null;

  checkedAt: string;
};

export type OperationalSmokeReport = {
  id: string;
  results: OperationalSmokeResult[];

  passed: boolean;
  failureCount: number;
  warningCount: number;

  createdAt: string;
  engineVersion: string;
};
