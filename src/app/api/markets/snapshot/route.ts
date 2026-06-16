import { NextRequest, NextResponse } from "next/server";
import { loadMarketBoardSnapshot } from "@/server/snapshots/market-board-snapshot-loader";
import { runKisSnapshotJob } from "@/server/jobs/market-board/kis-snapshot-job";
import { kisConfig } from "@/server/providers/kis/kis-config";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const universeId = searchParams.get("universeId");
  const refresh = searchParams.get("refresh") === "true";

  if (universeId !== "KOSPI_SAMPLE" && universeId !== "SP500_SAMPLE") {
    return NextResponse.json({ error: "Invalid universeId" }, { status: 400 });
  }

  try {
    // Dynamically regenerate KOSPI_SAMPLE snapshot if refresh is requested and KIS is configured
    if (universeId === "KOSPI_SAMPLE" && kisConfig.isConfigured && refresh) {
      await runKisSnapshotJob("KOSPI_SAMPLE");
    }

    const snapshot = await loadMarketBoardSnapshot(universeId);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
