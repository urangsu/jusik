import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";
import { SESSION_COOKIE_NAME, isValidSession } from "../login/route";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
  const headerToken = request.headers.get("x-provider-admin-token") ?? "";
  const expectedToken = process.env.PROVIDER_ADMIN_TOKEN ?? "";

  let authenticated = false;
  if (sessionToken && isValidSession(sessionToken)) {
    authenticated = true;
  } else if (headerToken && expectedToken.length >= 32 && headerToken === expectedToken) {
    authenticated = true;
  }

  const envelope: DataEnvelope<{ authenticated: boolean }> = {
    value: { authenticated },
    status: "real_time",
    source: "Admin Auth API",
    sourceTier: "official",
    warnings: [],
    updatedAt: new Date().toISOString(),
  };

  return createSafeResponse(envelope, 200);
}

export const dynamic = "force-dynamic";
