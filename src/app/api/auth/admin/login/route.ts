import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";

export const SESSION_COOKIE_NAME = "provider_admin_session";
const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// Store valid active session hashes in memory
const activeSessions = new Map<string, number>();

export function isValidSession(sessionToken: string): boolean {
  if (!sessionToken) return false;
  const expiresAt = activeSessions.get(sessionToken);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    activeSessions.delete(sessionToken);
    return false;
  }
  return true;
}

export function createSessionToken(): string {
  const token = crypto.randomBytes(32).toString("hex");
  activeSessions.set(token, Date.now() + SESSION_TTL_SECONDS * 1000);
  return token;
}

export function invalidateSessionToken(token: string): void {
  activeSessions.delete(token);
}

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.PROVIDER_ADMIN_TOKEN ?? "";
    if (expectedToken.length < 32) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Admin Auth API",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
        message: "서버의 PROVIDER_ADMIN_TOKEN 설정이 누락되었거나 32자 미만입니다.",
      };
      return createSafeResponse(envelope, 500);
    }

    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";

    const expectedBuf = Buffer.from(expectedToken);
    const inputBuf = Buffer.from(token);

    let tokenValid = false;
    if (expectedBuf.length === inputBuf.length && expectedBuf.length >= 32) {
      tokenValid = crypto.timingSafeEqual(expectedBuf, inputBuf);
    }

    if (!tokenValid) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Admin Auth API",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
        message: "유효하지 않은 관리자 토큰입니다.",
      };
      return createSafeResponse(envelope, 401);
    }

    const sessionToken = createSessionToken();
    const envelope: DataEnvelope<{ authenticated: true }> = {
      value: { authenticated: true },
      status: "real_time",
      source: "Admin Auth API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: "관리자 인증 성공",
    };

    const response = createSafeResponse(envelope, 200);
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    return response;
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Admin Auth API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
