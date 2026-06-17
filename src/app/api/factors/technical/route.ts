import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getTechnicalSignalSnapshot } from "@/server/factors/factor-store";
import { DataEnvelope } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const universeId = searchParams.get("universeId") || "KOSPI_SAMPLE";

  try {
    const snapshot = await getTechnicalSignalSnapshot(universeId);
    if (!snapshot) {
      const envelope: DataEnvelope<any> = {
        value: null,
        status: "not_found",
        source: "Local Filesystem",
        sourceTier: "personal_fallback",
        warnings: ["unofficial", "personal_use_only"],
        updatedAt: null,
        message: `No technical signals snapshot found for universe ${universeId}. Please run the calculation job first.`,
      };
      return createSafeResponse(envelope);
    }

    const envelope: DataEnvelope<any> = {
      value: snapshot,
      status: "cached",
      source: "Yahoo Finance via yfinance",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: snapshot.updatedAt,
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<any> = {
      value: null,
      status: "error",
      source: "Local Filesystem",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
