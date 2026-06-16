import { NextResponse } from "next/server";
import { redactSensitive } from "./redact-sensitive";

/**
 * Returns a NextResponse with redacted sensitive information.
 */
export function createSafeResponse<T>(data: T, status = 200): Response {
  const redacted = redactSensitive(data);
  return NextResponse.json(redacted, { status });
}
