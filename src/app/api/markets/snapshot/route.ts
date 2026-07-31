import { NextRequest } from "next/server";
import { loadMarketBoardSnapshot } from "@/server/snapshots/market-board-snapshot-loader";
import { runKisSnapshotJob } from "@/server/jobs/market-board/kis-snapshot-job";
import { kisConfig } from "@/server/providers/kis/kis-config";
import { DataEnvelope } from "@/domain/common/data-status";
import { MarketBoardSnapshot } from "@/domain/market-board/market-board-snapshot";
import { createSafeEnvelopeResponse } from "@/server/security/data-envelope-response";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const universeId = searchParams.get("universeId");
  const refresh = searchParams.get("refresh") === "true";

  if (universeId !== "KOSPI_SAMPLE" && universeId !== "SP500_SAMPLE") {
    const errorEnvelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "market-board-snapshot-store",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "Invalid universeId. Must be KOSPI_SAMPLE or SP500_SAMPLE.",
    };
    return createSafeEnvelopeResponse(errorEnvelope, 400);
  }

  try {
    if (universeId === "KOSPI_SAMPLE" && kisConfig.isConfigured && refresh) {
      await runKisSnapshotJob("KOSPI_SAMPLE");
    }

    const snapshot = await loadMarketBoardSnapshot(universeId);
    const hasData = snapshot.tiles.some((tile) => tile.price !== null);
    const isRealTime = snapshot.tiles.some((tile) => tile.dataStatus === "real_time");

    const envelope: DataEnvelope<MarketBoardSnapshot> = {
      value: snapshot,
      status: !hasData ? "api_required" : isRealTime ? "real_time" : "cached",
      source: "market-board-snapshot-store",
      sourceTier: "official",
      warnings: [],
      updatedAt: snapshot.generatedAt,
    };

    return createSafeEnvelopeResponse(envelope, 200);
  } catch (err) {
    const errorEnvelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "market-board-snapshot-store",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: (err as Error).message,
    };
    return createSafeEnvelopeResponse(errorEnvelope, 500);
  }
}

export const dynamic = "force-dynamic";
