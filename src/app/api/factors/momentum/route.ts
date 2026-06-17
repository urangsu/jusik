import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getFactorValues } from "@/server/factors/factor-store";
import { DataEnvelope } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");

  try {
    const allFactors = await getFactorValues();
    // Filter for momentum factor
    let filtered = allFactors.filter((v) => v.factorId === "momentum");
    if (assetId) {
      filtered = filtered.filter((v) => v.assetId === assetId);
    }

    const envelope: DataEnvelope<any[]> = {
      value: filtered,
      status: "cached",
      source: "Yahoo Finance via yfinance",
      sourceTier: "personal_fallback",
      warnings: ["unofficial", "personal_use_only"],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
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
