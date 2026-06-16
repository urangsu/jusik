import fs from "fs/promises";
import { MarketBoardSnapshot, getDefaultSnapshot } from "@/domain/market-board/market-board-snapshot";
import { getSnapshotPath } from "./snapshot-paths";
import { validateMarketBoardSnapshot } from "./snapshot-schema";
import { KOSPI_SAMPLE_CONSTITUENTS, SP500_SAMPLE_CONSTITUENTS } from "@/domain/universe/market-universe";
import { SourceWarning } from "@/domain/source/provider-tier";

export async function loadMarketBoardSnapshot(
  universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE"
): Promise<MarketBoardSnapshot> {
  const filepath = getSnapshotPath(universeId);
  try {
    const raw = await fs.readFile(filepath, "utf-8");
    const parsed = JSON.parse(raw);
    if (validateMarketBoardSnapshot(parsed)) {
      return parsed;
    }
    console.warn(`Validation failed for generated snapshot at ${filepath}. Falling back to static sample.`);
  } catch (err) {
    console.log(`Could not load generated snapshot at ${filepath}: ${(err as Error).message}. Falling back to static sample.`);
  }

  // Fallback 2: Static sample snapshot
  try {
    const staticSnapshot = getDefaultSnapshot(universeId);
    if (staticSnapshot && (staticSnapshot.tiles.length > 0 || staticSnapshot.tableRows.length > 0)) {
      return staticSnapshot;
    }
  } catch (err) {
    console.warn(`Static default snapshot loading failed: ${(err as Error).message}`);
  }

  // Fallback 3: Dynamic api_required snapshot
  return buildApiRequiredSnapshot(universeId);
}

function buildApiRequiredSnapshot(universeId: "KOSPI_SAMPLE" | "SP500_SAMPLE"): MarketBoardSnapshot {
  const constituents = universeId === "KOSPI_SAMPLE" ? KOSPI_SAMPLE_CONSTITUENTS : SP500_SAMPLE_CONSTITUENTS;
  const now = new Date().toISOString();
  
  const tiles = constituents.map(c => ({
    assetId: c.assetId,
    symbol: c.symbol,
    name: c.nameKo || c.nameEn || c.symbol,
    sector: c.sector || null,
    industry: c.industry || null,
    price: null,
    changePercent: null,
    marketCap: null,
    weight: null,
    volume: null,
    tileSizeMetric: "market_cap" as const,
    dataStatus: "api_required" as const,
    source: "System",
    sourceTier: "official" as const,
    warnings: [] as SourceWarning[],
    updatedAt: now
  }));

  const tableRows = constituents.map(c => ({
    assetId: c.assetId,
    symbol: c.symbol,
    name: c.nameKo || c.nameEn || c.symbol,
    sector: c.sector || null,
    industry: c.industry || null,
    price: null,
    changePercent: null,
    volume: null,
    turnover: null,
    marketCap: null,
    high52WeekPercent: null,
    return20Day: null,
    return60Day: null,
    per: null,
    pbr: null,
    roe: null,
    dividendYield: null,
    dataStatus: "api_required" as const,
    source: "System",
    sourceTier: "official" as const,
    warnings: [] as SourceWarning[],
    updatedAt: now
  }));

  return {
    universeId,
    generatedAt: now,
    sourceSummary: [],
    tiles,
    tableRows,
    missingData: [],
    warnings: ["API 연결 또는 최신 스냅샷 생성이 필요합니다."]
  };
}
