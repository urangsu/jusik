import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getCurrentSignals } from "@/server/signals/signal-history-store";
import { DataEnvelope } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  try {
    const currentSignals = await getCurrentSignals();
    const envelope: DataEnvelope<any> = {
      value: currentSignals || {},
      status: currentSignals ? "cached" : "insufficient_data",
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
