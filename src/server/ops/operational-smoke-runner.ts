import type {
  OperationalSmokeReport,
  OperationalSmokeResult,
  OperationalSmokeExpectation,
  OperationalSmokeSeverity,
} from "@/domain/ops/operational-smoke";
import {
  OPERATIONAL_SMOKE_TARGETS,
  type OperationalSmokeTarget,
} from "./operational-smoke-targets";

const ENGINE_VERSION = "1.0.0-smoke";

type DataEnvelopeShape = {
  value?: unknown;
  status?: string;
  source?: string;
  sourceTier?: string;
  warnings?: unknown[];
  updatedAt?: string | null;
  message?: string;
};

function parseEnvelope(raw: unknown): DataEnvelopeShape | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  // Must have at least status and source to be a valid DataEnvelope
  if (typeof obj["status"] !== "string" || typeof obj["source"] !== "string") {
    return null;
  }
  return obj as DataEnvelopeShape;
}

const DATA_STATUSES = new Set([
  "real_time",
  "delayed",
  "eod",
  "cached",
  "stale",
]);

/**
 * Evaluates whether a raw response satisfies an expected smoke outcome.
 * Returns { passed, severity, message }.
 */
function evaluateResult(
  target: OperationalSmokeTarget,
  httpStatus: number,
  envelope: DataEnvelopeShape | null
): { passed: boolean; severity: OperationalSmokeSeverity; message: string | null } {
  // HTTP 500 is always a failure
  if (httpStatus >= 500) {
    return {
      passed: false,
      severity: "error",
      message: `HTTP ${httpStatus}: 서버 오류 — DataEnvelope 없이 실패했습니다.`,
    };
  }

  // DataEnvelope 구조가 없으면 실패 (source/sourceTier 누락)
  if (!envelope) {
    return {
      passed: false,
      severity: "error",
      message: "DataEnvelope 구조가 없거나 source/status 필드가 누락되었습니다.",
    };
  }

  const envelopeStatus = envelope.status ?? "";
  const expectation: OperationalSmokeExpectation =
    target.requiresApiKey
      ? target.expectedWithoutKey
      : target.expectedWithoutKey;

  switch (expectation) {
    case "data_available": {
      const hasData =
        envelope.value !== null &&
        envelope.value !== undefined &&
        DATA_STATUSES.has(envelopeStatus);
      if (!hasData) {
        return {
          passed: false,
          severity: "error",
          message: `data_available 기대: status=${envelopeStatus}, value=${JSON.stringify(envelope.value)?.substring(0, 60)}`,
        };
      }
      return { passed: true, severity: "info", message: null };
    }

    case "not_supported_expected": {
      if (envelopeStatus !== "not_supported") {
        return {
          passed: false,
          severity: "error",
          message: `not_supported 기대: 실제 status=${envelopeStatus}`,
        };
      }
      return { passed: true, severity: "info", message: null };
    }

    case "api_required_allowed": {
      if (envelopeStatus === "api_required") {
        return { passed: true, severity: "warning", message: "api_required — API 키 또는 설정이 필요합니다." };
      }
      // If data is available, that's also fine
      if (DATA_STATUSES.has(envelopeStatus) && httpStatus < 500) {
        return { passed: true, severity: "info", message: null };
      }
      // error / other non-expected statuses
      return {
        passed: false,
        severity: "error",
        message: `api_required_allowed 기대: 실제 status=${envelopeStatus}`,
      };
    }

    case "empty_allowed": {
      if (envelopeStatus === "error") {
        return {
          passed: false,
          severity: "error",
          message: `empty_allowed 기대이나 envelope.status=error: ${envelope.message ?? ""}`,
        };
      }
      // null/[] value is fine, anything non-error is fine
      return { passed: true, severity: "info", message: null };
    }

    case "blocked_expected": {
      const val = envelope.value as Record<string, unknown> | null;
      const isBlocked = val && typeof val === "object" && val["isBlocked"] === true;
      if (!isBlocked) {
        return {
          passed: false,
          severity: "error",
          message: `blocked_expected 기대이나 output.isBlocked가 true가 아닙니다.`,
        };
      }
      return { passed: true, severity: "info", message: null };
    }

    case "error_unexpected":
    default:
      if (envelopeStatus === "error" || httpStatus >= 500) {
        return { passed: false, severity: "error", message: `예상치 못한 오류: status=${envelopeStatus}` };
      }
      return { passed: true, severity: "info", message: null };
  }
}

/**
 * Runs the operational smoke harness against all targets.
 *
 * In-process implementation: does NOT use fetch internally.
 * API routes are called via their handler functions directly.
 * This avoids network dependency in CLI/test environments.
 */
export async function runOperationalSmoke(input?: {
  baseUrl?: string;
  includeKeyRequired?: boolean;
  sampleFindingId?: string | null;
}): Promise<OperationalSmokeReport> {
  const sampleFindingId = input?.sampleFindingId ?? null;
  const baseUrl = input?.baseUrl ?? "http://localhost:3000";

  const results: OperationalSmokeResult[] = [];
  const now = new Date().toISOString();

  for (const target of OPERATIONAL_SMOKE_TARGETS) {
    // Handle skipWhen
    if (target.skipWhen === "no_audit_finding" && !sampleFindingId) {
      results.push({
        id: target.id,
        method: target.method,
        endpoint: target.endpoint,
        requiresApiKey: target.requiresApiKey,
        requiresRuntimeData: target.requiresRuntimeData,
        expectedWithoutKey: target.expectedWithoutKey,
        expectedWithKey: target.expectedWithKey,
        httpStatus: null,
        envelopeStatus: null,
        dataAvailable: false,
        valueType: null,
        source: null,
        sourceTier: null,
        warnings: [],
        updatedAt: null,
        passed: true,
        severity: "info",
        message: "sampleFindingId 없음 — 건너뜀",
        checkedAt: now,
      });
      continue;
    }

    // Substitute sampleFindingId in body if needed
    let body = target.body;
    if (body && sampleFindingId && target.id === "audit_replay") {
      body = { ...(body as object), findingId: sampleFindingId };
    }

    let httpStatus = 0;
    let envelope: DataEnvelopeShape | null = null;

    try {
      const url = `${baseUrl}${target.endpoint}`;
      const fetchOptions: RequestInit = {
        method: target.method,
        headers: { "content-type": "application/json" },
      };
      if (target.method === "POST" && body !== undefined) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      httpStatus = response.status;

      try {
        const raw = await response.json();
        envelope = parseEnvelope(raw);
      } catch {
        // JSON parse failure — treat as no envelope
        envelope = null;
      }
    } catch (err: any) {
      httpStatus = 0;
      envelope = null;
    }

    const { passed, severity, message } = evaluateResult(target, httpStatus, envelope);

    const valueType =
      envelope?.value === null || envelope?.value === undefined
        ? "null"
        : Array.isArray(envelope.value)
        ? "array"
        : typeof envelope.value;

    results.push({
      id: target.id,
      method: target.method,
      endpoint: target.endpoint,
      requiresApiKey: target.requiresApiKey,
      requiresRuntimeData: target.requiresRuntimeData,
      expectedWithoutKey: target.expectedWithoutKey,
      expectedWithKey: target.expectedWithKey,
      httpStatus: httpStatus || null,
      envelopeStatus: envelope?.status ?? null,
      dataAvailable: envelope !== null && envelope.value !== null && envelope.value !== undefined,
      valueType,
      source: envelope?.source ?? null,
      sourceTier: envelope?.sourceTier ?? null,
      warnings: Array.isArray(envelope?.warnings)
        ? (envelope!.warnings as string[]).filter((w) => typeof w === "string")
        : [],
      updatedAt: envelope?.updatedAt ?? null,
      passed,
      severity,
      message,
      checkedAt: now,
    });
  }

  const failureCount = results.filter((r) => !r.passed).length;
  const warningCount = results.filter((r) => r.passed && r.severity === "warning").length;

  const reportId = `smoke_${Date.now()}`;

  return {
    id: reportId,
    results,
    passed: failureCount === 0,
    failureCount,
    warningCount,
    createdAt: now,
    engineVersion: ENGINE_VERSION,
  };
}
