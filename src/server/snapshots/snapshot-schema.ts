import { MarketBoardSnapshot } from "@/domain/market-board/market-board-snapshot";

export function validateMarketBoardSnapshot(data: unknown): data is MarketBoardSnapshot {
  if (!data || typeof data !== "object") return false;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as Record<string, any>;
  
  if (typeof d.universeId !== "string") return false;
  if (typeof d.generatedAt !== "string") return false;
  if (!Array.isArray(d.sourceSummary)) return false;
  if (!Array.isArray(d.tiles)) return false;
  if (!Array.isArray(d.tableRows)) return false;
  if (!Array.isArray(d.missingData)) return false;
  
  // Validate basic elements if list has contents
  if (d.tiles.length > 0) {
    const tile = d.tiles[0];
    if (!tile || typeof tile !== "object") return false;
    if (typeof tile.symbol !== "string" || typeof tile.assetId !== "string") {
      return false;
    }
  }

  if (d.tableRows.length > 0) {
    const row = d.tableRows[0];
    if (!row || typeof row !== "object") return false;
    if (typeof row.symbol !== "string" || typeof row.assetId !== "string") {
      return false;
    }
  }

  return true;
}
