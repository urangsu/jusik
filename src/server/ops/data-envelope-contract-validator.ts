import type { DataEnvelope, DataStatus } from "@/domain/common/data-status";
import type { DataEnvelopeContractValidation } from "@/domain/ops/real-provider-smoke";

const VALID_STATUSES = new Set<DataStatus>([
  "real_time",
  "delayed",
  "eod",
  "cached",
  "stale",
  "api_required",
  "rate_limited",
  "not_supported",
  "not_found",
  "error",
  "insufficient_data",
]);

const DATA_AVAILABLE_STATUSES = new Set<DataStatus>([
  "real_time",
  "delayed",
  "eod",
  "cached",
  "stale",
]);

const NULL_VALUE_ALLOWED_STATUSES = new Set<DataStatus>([
  "api_required",
  "rate_limited",
  "not_supported",
  "not_found",
  "error",
  "insufficient_data",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDataStatus(value: unknown): value is DataStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as DataStatus);
}

export function validateDataEnvelopeContract(raw: unknown): DataEnvelopeContractValidation {
  const failures: string[] = [];

  if (!isObject(raw)) {
    return {
      passed: false,
      status: null,
      dataAvailable: false,
      source: null,
      sourceTier: null,
      warnings: [],
      updatedAt: null,
      failures: ["DataEnvelope must be an object."],
    };
  }

  const envelope = raw as Partial<DataEnvelope<unknown>>;
  const status = isDataStatus(envelope.status) ? envelope.status : null;
  const source = typeof envelope.source === "string" && envelope.source.trim() ? envelope.source : null;
  const sourceTier =
    typeof envelope.sourceTier === "string" && envelope.sourceTier.trim() ? envelope.sourceTier : null;
  const rawWarnings = raw["warnings"];
  const warnings = Array.isArray(rawWarnings)
    ? rawWarnings.filter((warning): warning is string => typeof warning === "string")
    : [];
  const updatedAt =
    typeof envelope.updatedAt === "string" || envelope.updatedAt === null ? envelope.updatedAt : null;
  const dataAvailable =
    status !== null &&
    DATA_AVAILABLE_STATUSES.has(status) &&
    envelope.value !== null &&
    envelope.value !== undefined;

  if (!status) failures.push("status is missing or invalid.");
  if (!source) failures.push("source is required.");
  if (!sourceTier) failures.push("sourceTier is required.");
  if (!Array.isArray(rawWarnings)) failures.push("warnings must be an array.");
  if (!Object.prototype.hasOwnProperty.call(envelope, "updatedAt")) {
    failures.push("updatedAt is required.");
  }

  if (status && DATA_AVAILABLE_STATUSES.has(status) && (envelope.value === null || envelope.value === undefined)) {
    failures.push(`value cannot be null when status=${status}.`);
  }

  if (status && DATA_AVAILABLE_STATUSES.has(status) && updatedAt === null) {
    failures.push(`updatedAt cannot be null when status=${status}.`);
  }

  if (status && NULL_VALUE_ALLOWED_STATUSES.has(status) && envelope.value !== null) {
    // not_found may legitimately carry an empty payload in some provider APIs, so keep this a warning-level pass.
    if (status !== "not_found") {
      failures.push(`value should be null when status=${status}.`);
    }
  }

  return {
    passed: failures.length === 0,
    status,
    dataAvailable,
    source,
    sourceTier,
    warnings,
    updatedAt,
    failures,
  };
}
