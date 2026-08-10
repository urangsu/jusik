import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";
import { SESSION_COOKIE_NAME, invalidateSessionToken } from "../login/route";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
  if (sessionToken) {
    invalidateSessionToken(sessionToken);
  }

  const envelope: DataEnvelope<{ authenticated: false }> = {
    value: { authenticated: false },
    status: "real_time",
    source: "Admin Auth API",
    sourceTier: "official",
    warnings: [],
    updatedAt: new Date().toISOString(),
    message: "로그아웃 되었습니다.",
  };

  const response = createSafeResponse(envelope, 200);
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export const dynamic = "force-dynamic";
