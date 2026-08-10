import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSafeResponse } from "./safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";
import { SESSION_COOKIE_NAME, isValidSession } from "@/app/api/auth/admin/login/route";

// Process-local rate limiter
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
  | { authorized: false; response: NextResponse };

/**
 * Common admin guard for provider settings & probe routes.
 *
 * Checks:
 * 1. PROVIDER_ADMIN_TOKEN must be configured (≥ 32 chars)
 * 2. Either Header `x-provider-admin-token` or HttpOnly `provider_admin_session` cookie valid
 * 3. Browser mutation requests (POST/PUT/DELETE) must match allowed Origin exactly
 * 4. Rate limiting applied
 */
export function requireProviderAdmin(
  request: NextRequest,
  options?: { isMutation?: boolean }
): AdminGuardResult {
  const expectedToken = process.env.PROVIDER_ADMIN_TOKEN ?? "";

  // 1. Unconfigured or weak admin token (must be >= 32 chars)
  if (expectedToken.length < 32) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "provider_admin_guard",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: "서버의 PROVIDER_ADMIN_TOKEN 설정이 누락되었거나 32자 미만입니다.",
    };
    return {
      authorized: false,
      response: createSafeResponse(envelope, 500),
    };
  }

  // Check header token
  const clientToken = request.headers.get("x-provider-admin-token") ?? "";
  const expectedBuf = Buffer.from(expectedToken);
  const clientBuf = Buffer.from(clientToken);

  let headerValid = false;
  if (expectedBuf.length === clientBuf.length && expectedBuf.length >= 32) {
    headerValid = crypto.timingSafeEqual(expectedBuf, clientBuf);
  }

  // Check cookie session
  const cookieSession = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
  const cookieValid = isValidSession(cookieSession);

  // 2. Auth failure
  if (!headerValid && !cookieValid) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "provider_admin_guard",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: "인증 실패: 유효한 관리자 토큰이나 세션 쿠키가 필요합니다.",
    };
    return {
      authorized: false,
      response: createSafeResponse(envelope, 401),
    };
  }

  // 3. Strict Origin check for browser mutations
  const isMutation = options?.isMutation ?? ["POST", "PUT", "DELETE", "PATCH"].includes(request.method);
  if (isMutation) {
    const originHeader = request.headers.get("origin");
    if (!originHeader) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "provider_admin_guard",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
        message: "CSRF 보호: Origin 헤더가 누락되었습니다.",
      };
      return {
        authorized: false,
        response: createSafeResponse(envelope, 403),
      };
    }

    const internalOrigin = process.env.INTERNAL_APP_ORIGIN || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    try {
      const reqOriginUrl = new URL(originHeader);
      const allowedOriginUrl = new URL(internalOrigin);

      // Compare exact protocol, host, and port
      if (reqOriginUrl.origin !== allowedOriginUrl.origin) {
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

  // 4. Rate limiting (key by principal / socket rather than raw untrusted XFF)
  const clientKey = cookieSession || clientToken.slice(0, 16) || "local_client";
  if (isRateLimited(clientKey)) {
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
