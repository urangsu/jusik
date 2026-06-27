import type {
  OperationalSmokeTargetId,
  OperationalSmokeExpectation,
} from "@/domain/ops/operational-smoke";

export type OperationalSmokeTarget = {
  id: OperationalSmokeTargetId;
  method: "GET" | "POST";
  endpoint: string;
  body?: unknown;

  requiresApiKey: boolean;
  requiresRuntimeData: boolean;

  expectedWithoutKey: OperationalSmokeExpectation;
  expectedWithKey: OperationalSmokeExpectation;

  /** Skip this target when a precondition is not met. */
  skipWhen?: "no_audit_finding";
};

// samplePromptInput used for ai_provider_run targets
const SMOKE_PROMPT_INPUT = {
  id: "pi_smoke_test",
  intent: "audit_finding_explanation" as const,
  systemPolicy: {
    language: "ko" as const,
    forbiddenActions: [],
    requiredDisclaimers: [
      "본 내용은 감사 Finding의 진단 설명이며 투자 지시가 아닙니다.",
    ],
    outputFormat: "structured_json_only" as const,
  },
  contextPack: {
    id: "smoke_context",
    intent: "audit_finding_explanation" as const,
    sourceRefs: [
      {
        sourceType: "audit_finding",
        sourceId: "smoke_context",
        source: "smoke_harness",
        status: "cached",
        updatedAt: new Date().toISOString(),
        warnings: [],
      },
    ],
    facts: [],
    limitations: [],
    createdAt: new Date().toISOString(),
  },
  userInstruction: null,
  allowedClaimSourceIds: ["smoke_context"],
  requiredOutputSchema: "StructuredAiOutput" as const,
  createdAt: new Date().toISOString(),
};

/**
 * The canonical operational smoke target matrix.
 * Exactly 10 targets — no duplicates of existing unit tests.
 */
export const OPERATIONAL_SMOKE_TARGETS: OperationalSmokeTarget[] = [
  {
    id: "ai_providers",
    method: "GET",
    endpoint: "/api/ai/providers",
    requiresApiKey: false,
    requiresRuntimeData: false,
    expectedWithoutKey: "data_available",
    expectedWithKey: "data_available",
  },
  {
    id: "ai_provider_run_mock",
    method: "POST",
    endpoint: "/api/ai/providers/run",
    body: {
      providerId: "mock",
      promptInput: SMOKE_PROMPT_INPUT,
      requestHash: "smoke_mock_hash",
      locale: "ko",
    },
    requiresApiKey: false,
    requiresRuntimeData: false,
    expectedWithoutKey: "data_available",
    expectedWithKey: "data_available",
  },
  {
    id: "ai_provider_run_disabled_openai",
    method: "POST",
    endpoint: "/api/ai/providers/run",
    body: {
      providerId: "disabled_openai",
      promptInput: SMOKE_PROMPT_INPUT,
      requestHash: "smoke_disabled_openai_hash",
      locale: "ko",
    },
    requiresApiKey: false,
    requiresRuntimeData: false,
    expectedWithoutKey: "not_supported_expected",
    expectedWithKey: "not_supported_expected",
  },
  {
    id: "market_quote_kr",
    method: "GET",
    endpoint: "/api/market/quote?symbol=005930&region=KR",
    requiresApiKey: true,
    requiresRuntimeData: true,
    expectedWithoutKey: "api_required_allowed",
    expectedWithKey: "data_available",
  },
  {
    id: "market_ohlcv_kr",
    method: "GET",
    endpoint: "/api/market/ohlcv?symbol=005930&region=KR&range=1M&interval=1D",
    requiresApiKey: true,
    requiresRuntimeData: true,
    expectedWithoutKey: "api_required_allowed",
    expectedWithKey: "data_available",
  },
  {
    id: "opendart_disclosures",
    method: "GET",
    endpoint: "/api/opendart/disclosures?stockCode=005930",
    requiresApiKey: true,
    requiresRuntimeData: false,
    expectedWithoutKey: "api_required_allowed",
    expectedWithKey: "empty_allowed",
  },
  {
    id: "audit_findings",
    method: "GET",
    endpoint: "/api/audit/findings",
    requiresApiKey: false,
    requiresRuntimeData: false,
    expectedWithoutKey: "empty_allowed",
    expectedWithKey: "empty_allowed",
  },
  {
    id: "audit_replay",
    method: "POST",
    endpoint: "/api/ai/replay/audit-finding",
    body: { findingId: "__SAMPLE_FINDING_ID__", modes: ["safe"] },
    requiresApiKey: false,
    requiresRuntimeData: true,
    expectedWithoutKey: "empty_allowed",
    expectedWithKey: "empty_allowed",
    skipWhen: "no_audit_finding",
  },
  {
    id: "watchlist_reports",
    method: "GET",
    endpoint: "/api/watchlist/reports",
    requiresApiKey: false,
    requiresRuntimeData: false,
    expectedWithoutKey: "empty_allowed",
    expectedWithKey: "empty_allowed",
  },
  {
    id: "provider_health",
    method: "GET",
    endpoint: "/api/providers/health",
    requiresApiKey: false,
    requiresRuntimeData: false,
    expectedWithoutKey: "data_available",
    expectedWithKey: "data_available",
  },
];
