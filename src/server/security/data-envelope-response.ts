import { DataEnvelope } from "@/domain/common/data-status";
import { createSafeResponse } from "./safe-api-response";

/**
 * Type guard checking if a DataEnvelope contains usable, non-null financial data.
 */
export function hasUsableData<T>(
  envelope: DataEnvelope<T> | null | undefined
): envelope is DataEnvelope<T> & { value: T; updatedAt: string } {
  if (!envelope) return false;
  return (
    ["real_time", "delayed", "eod", "cached", "stale"].includes(envelope.status) &&
    envelope.value !== null &&
    envelope.value !== undefined &&
    envelope.updatedAt !== null &&
    envelope.updatedAt !== undefined
  );
}

/**
 * Creates a safe NextResponse wrapping a DataEnvelope, ensuring proper header redacting.
 */
export function createSafeEnvelopeResponse<T>(
  envelope: DataEnvelope<T>,
  httpStatus = 200
): Response {
  return createSafeResponse(envelope, httpStatus);
}
