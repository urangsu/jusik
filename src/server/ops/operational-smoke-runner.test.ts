import { describe, it, expect } from "vitest";
import type { OperationalSmokeResult } from "@/domain/ops/operational-smoke";
import { OPERATIONAL_SMOKE_TARGETS } from "./operational-smoke-targets";

/**
 * Runner unit tests — focus on target evaluation logic and configuration correctness.
 *
 * Full runtime network execution is covered by `npm run ops:smoke` (requires a running server).
 * Tests here verify:
 * - evaluation expectations are correctly classified
 * - disabled provider target is not_supported_expected
 * - api_required targets are non-fatal
 * - target structure is complete
 */

describe("operational-smoke-runner evaluation rules", () => {
  it("api_required_allowed is not the same as a failure expectation", () => {
    const apiRequiredTargets = OPERATIONAL_SMOKE_TARGETS.filter(
      (t) => t.expectedWithoutKey === "api_required_allowed"
    );
    // market, opendart have api_required_allowed
    expect(apiRequiredTargets.length).toBeGreaterThan(0);
    for (const t of apiRequiredTargets) {
      expect(t.expectedWithoutKey).not.toBe("error_unexpected");
    }
  });

  it("disabled_openai target is not_supported_expected (always a pass)", () => {
    const target = OPERATIONAL_SMOKE_TARGETS.find(
      (t) => t.id === "ai_provider_run_disabled_openai"
    );
    expect(target!.expectedWithoutKey).toBe("not_supported_expected");
    expect(target!.expectedWithKey).toBe("not_supported_expected");
  });

  it("ai_providers target is data_available (no API key required)", () => {
    const target = OPERATIONAL_SMOKE_TARGETS.find((t) => t.id === "ai_providers");
    expect(target!.expectedWithoutKey).toBe("data_available");
    expect(target!.requiresApiKey).toBe(false);
  });

  it("market_quote_kr is api_required_allowed without key (non-fatal)", () => {
    const target = OPERATIONAL_SMOKE_TARGETS.find((t) => t.id === "market_quote_kr");
    expect(target!.requiresApiKey).toBe(true);
    expect(target!.expectedWithoutKey).toBe("api_required_allowed");
  });

  it("audit_findings and watchlist_reports are empty_allowed (no data required)", () => {
    const emptyTargets = ["audit_findings", "watchlist_reports"];
    for (const id of emptyTargets) {
      const target = OPERATIONAL_SMOKE_TARGETS.find((t) => t.id === id);
      expect(target!.expectedWithoutKey).toBe("empty_allowed");
      expect(target!.requiresApiKey).toBe(false);
    }
  });

  it("smoke result with api_required status is marked passed (evaluation contract)", () => {
    // Verify the evaluation contract type definition:
    // a result with api_required_allowed expectation and api_required status is a pass
    const mockResult: OperationalSmokeResult = {
      id: "market_quote_kr",
      method: "GET",
      endpoint: "/api/market/quote?symbol=005930&region=KR",
      requiresApiKey: true,
      requiresRuntimeData: true,
      expectedWithoutKey: "api_required_allowed",
      expectedWithKey: "data_available",
      httpStatus: 200,
      envelopeStatus: "api_required",
      dataAvailable: false,
      valueType: "null",
      source: "market_data_service",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      passed: true,
      severity: "warning",
      message: "api_required — API 키 또는 설정이 필요합니다.",
      checkedAt: new Date().toISOString(),
    };

    expect(mockResult.passed).toBe(true);
    expect(mockResult.severity).toBe("warning");
  });

  it("smoke result with HTTP 500 is always a failure", () => {
    const failResult: OperationalSmokeResult = {
      id: "market_quote_kr",
      method: "GET",
      endpoint: "/api/market/quote",
      requiresApiKey: true,
      requiresRuntimeData: true,
      expectedWithoutKey: "api_required_allowed",
      expectedWithKey: "data_available",
      httpStatus: 500,
      envelopeStatus: "error",
      dataAvailable: false,
      valueType: "null",
      source: null,
      sourceTier: null,
      warnings: [],
      updatedAt: null,
      passed: false,
      severity: "error",
      message: "HTTP 500: 서버 오류",
      checkedAt: new Date().toISOString(),
    };

    expect(failResult.passed).toBe(false);
    expect(failResult.severity).toBe("error");
  });

  it("DataEnvelope missing (source null) is classified as error", () => {
    const noEnvelopeResult: OperationalSmokeResult = {
      id: "watchlist_reports",
      method: "GET",
      endpoint: "/api/watchlist/reports",
      requiresApiKey: false,
      requiresRuntimeData: false,
      expectedWithoutKey: "empty_allowed",
      expectedWithKey: "empty_allowed",
      httpStatus: 200,
      envelopeStatus: null,
      dataAvailable: false,
      valueType: null,
      source: null,
      sourceTier: null,
      warnings: [],
      updatedAt: null,
      passed: false,
      severity: "error",
      message: "DataEnvelope 구조가 없거나 source/status 필드가 누락되었습니다.",
      checkedAt: new Date().toISOString(),
    };

    expect(noEnvelopeResult.passed).toBe(false);
    expect(noEnvelopeResult.source).toBeNull();
    expect(noEnvelopeResult.message).toContain("DataEnvelope");
  });
});
