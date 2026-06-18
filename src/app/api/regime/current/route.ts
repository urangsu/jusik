import { NextRequest } from "next/server";
import { regimeStore } from "@/server/regime/regime-store";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get("market");

    if (market !== "US" && market !== "KR") {
      return Response.json(
        {
          status: "error",
          message: "Valid 'market' parameter ('US' or 'KR') is required.",
        },
        { status: 400 }
      );
    }

    const snapshot = await regimeStore.getLatestSnapshot(market);

    if (!snapshot) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "insufficient_data",
        source: "Macro Regime Engine v1",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: "No calculated snapshot available.",
      };
      return createSafeResponse(envelope);
    }

    const envelope: DataEnvelope<typeof snapshot> = {
      value: snapshot,
      status: snapshot.dataStatus,
      source: snapshot.source,
      sourceTier: snapshot.sourceTier,
      warnings: ["unofficial"],
      updatedAt: snapshot.updatedAt,
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Macro Regime Engine v1",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
