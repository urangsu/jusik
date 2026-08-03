import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSafeResponse } from "./safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";

// Process-local simple rate limiter (token bucket per ip/token)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  record.count += 1;
  return false;
}

export type AdminGuardResult =
  | { authorized: true }
  | { authorized: false; response: Response };

/**
 * Common admin guard for provider settings & probe routes.
 *
 * Checks:
 * 1. PROVIDER_ADMIN_TOKEN must be configured (≥ 16 chars)
 * 2. Header `x-provider-admin-token` must match using crypto.timingSafeEqual
 * 3. Browser mutation requests (POST/PUT/DELETE) must match allowed Origin
 * 4. Rate limiting applied per client
 */
export function requireProviderAdmin(
  request: NextRequest,
  options?: { isMutation?: boolean }
): AdminGuardResult {
  const expectedToken = process.env.PROVIDER_ADMIN_TOKEN ?? "";

  // 1. Unconfigured or weak admin token
  if (expectedToken.length < 16) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "provider_admin_guard",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: "서버의 PROVIDER_ADMIN_TOKEN 설정이 누락되었거나 너무 짧습니다.",
    };
    return {
      authorized: false,
      response: createSafeResponse(envelope, 500),
    };
  }

  const clientToken = request.headers.get("x-provider-admin-token") ?? "";
  const expectedBuf = Buffer.from(expectedToken);
  const clientBuf = Buffer.from(clientToken);

  let tokenValid = false;
  if (expectedBuf.length === clientBuf.length && expectedBuf.length > 0) {
    tokenValid = crypto.timingSafeEqual(expectedBuf, clientBuf);
  }

  // 2. Token mismatch
  if (!tokenValid) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "provider_admin_guard",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: "인증 실패: 유효하지 않거나 누락된 admin 토큰입니다.",
    };
    return {
      authorized: false,
      response: createSafeResponse(envelope, 401),
    };
  }

  // 3. Browser mutation origin check (if applicable)
  const isMutation = options?.isMutation ?? ["POST", "PUT", "DELETE", "PATCH"].includes(request.method);
  if (isMutation) {
    const origin = request.headers.get("origin");
    const allowedOrigin = process.env.INTERNAL_APP_ORIGIN || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    if (origin && allowedOrigin) {
      try {
        const reqOriginHost = new URL(origin).host;
        const allowedOriginHost = new URL(allowedOrigin).host;
        if (reqOriginHost !== allowedOriginHost) {
          const envelope: DataEnvelope<null> = {
            value: null,
            status: "error",
            source: "provider_admin_guard",
            sourceTier: "official",
            warnings: [],
            updatedAt: new Date().toISOString(),
            message: "CSRF 보호: 허용되지 않은 Origin입니다.",
          };
          return {
            authorized: false,
            response: createSafeResponse(envelope, 403),
          };
        }
      } catch {
        // Invalid origin header
        const envelope: DataEnvelope<null> = {
          value: null,
          status: "error",
          source: "provider_admin_guard",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
          message: "CSRF 보호: 유효하지 않은 Origin 헤더입니다.",
        };
        return {
          authorized: false,
          response: createSafeResponse(envelope, 403),
        };
      }
    }
  }

  // 4. Rate limit check
  const clientIp = request.headers.get("x-forwarded-for") || "local";
  if (isRateLimited(clientIp)) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "rate_limited",
      source: "provider_admin_guard",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
    };
    return {
      authorized: false,
      response: createSafeResponse(envelope, 429),
    };
  }

  return { authorized: true };
}
