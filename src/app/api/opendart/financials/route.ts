import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getOpenDartConfig } from "@/server/opendart/opendart-config";
import type { DataEnvelope } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  const corpCode = request.nextUrl.searchParams.get("corpCode");

  if (!corpCode) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "insufficient_data",
      source: "OpenDART Financials API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "corpCode query parameter is required.",
    };
    return createSafeResponse(envelope, 400);
  }

  const config = getOpenDartConfig();

  if (!config.enabled) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "api_required",
      source: "OpenDART Financials API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "OpenDART financials provider requires OPENDART_API_KEY and OPENDART_ENABLED=true.",
    };
    return createSafeResponse(envelope, 200);
  }

  const envelope: DataEnvelope<null> = {
    value: null,
    status: "not_supported",
    source: "OpenDART Financials API",
    sourceTier: "official",
    warnings: [],
    updatedAt: null,
    message: "OpenDART financial statement parsing is not wired yet.",
  };
  return createSafeResponse(envelope, 200);
}

export const dynamic = "force-dynamic";
