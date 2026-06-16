import { NextRequest, NextResponse } from "next/server";
import { loadMarketBoardSnapshot } from "@/server/snapshots/market-board-snapshot-loader";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const universeId = searchParams.get("universeId");

  if (universeId !== "KOSPI_SAMPLE" && universeId !== "SP500_SAMPLE") {
    return NextResponse.json({ error: "Invalid universeId" }, { status: 400 });
  }

  try {
    const snapshot = await loadMarketBoardSnapshot(universeId);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
