import { MarketBoardPage } from "@/components/market-board/MarketBoardPage";
import { loadMarketBoardSnapshot } from "@/server/snapshots/market-board-snapshot-loader";

export default async function Markets() {
  const initialSnapshot = await loadMarketBoardSnapshot("KOSPI_SAMPLE");

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <MarketBoardPage initialSnapshot={initialSnapshot} />
    </main>
  );
}
