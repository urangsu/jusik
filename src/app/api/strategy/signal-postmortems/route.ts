import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listSignalPostmortems, SignalPostmortemQuery } from "@/server/strategy/signal-postmortem-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { SignalPostmortem } from "@/domain/strategy/signal-postmortem";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trialId = searchParams.get("trialId") || undefined;
    const strategyId = searchParams.get("strategyId") || undefined;
    const universeId = (searchParams.get("universeId") as any) || undefined;
    const assetId = searchParams.get("assetId") || undefined;
    const outcome = (searchParams.get("outcome") as any) || undefined;
    const status = (searchParams.get("status") as any) || undefined;

    const query: SignalPostmortemQuery = {
      trialId,
      strategyId,
      universeId,
      assetId,
      outcome,
      status,
    };

    const postmortems = await listSignalPostmortems(query);

    const envelope: DataEnvelope<SignalPostmortem[]> = {
      value: postmortems,
      status: "cached",
      source: "Signal Postmortems API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Signal Postmortems API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
