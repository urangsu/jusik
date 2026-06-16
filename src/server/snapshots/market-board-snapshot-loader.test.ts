import { vi, describe, it, expect, beforeEach } from "vitest";
import { loadMarketBoardSnapshot } from "./market-board-snapshot-loader";
import { getDefaultSnapshot } from "@/domain/market-board/market-board-snapshot";
import fs from "fs/promises";

vi.mock("fs/promises");

describe("MarketBoardSnapshotLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load generated snapshot when file exists and is valid", async () => {
    const mockSnapshot = {
      universeId: "KOSPI_SAMPLE",
      generatedAt: "2026-06-16T12:00:00.000Z",
      sourceSummary: [],
      tiles: [
        {
          assetId: "KR:005930",
          symbol: "005930",
          name: "삼성전자",
          sector: "Tech",
          industry: "Semiconductor",
          price: 72000,
          changePercent: 1.5,
          marketCap: 430000000000000,
          weight: null,
          volume: 1000000,
          tileSizeMetric: "market_cap",
          dataStatus: "cached",
          source: "Yahoo Finance",
          sourceTier: "personal_fallback",
          warnings: ["unofficial"],
          updatedAt: "2026-06-16T12:00:00.000Z"
        }
      ],
      tableRows: [
        {
          assetId: "KR:005930",
          symbol: "005930",
          name: "삼성전자",
          sector: "Tech",
          industry: "Semiconductor",
          price: 72000,
          changePercent: 1.5,
          volume: 1000000,
          turnover: 72000000000,
          marketCap: 430000000000000,
          high52WeekPercent: -5.0,
          return20Day: 2.0,
          return60Day: 4.0,
          per: 12.0,
          pbr: 1.2,
          roe: 10.0,
          dividendYield: 2.0,
          dataStatus: "cached",
          source: "Yahoo Finance",
          sourceTier: "personal_fallback",
          warnings: ["unofficial"],
          updatedAt: "2026-06-16T12:00:00.000Z"
        }
      ],
      missingData: [],
      warnings: []
    };

    vi.spyOn(fs, "readFile").mockResolvedValue(JSON.stringify(mockSnapshot));

    const result = await loadMarketBoardSnapshot("KOSPI_SAMPLE");
    expect(result.universeId).toBe("KOSPI_SAMPLE");
    expect(result.tiles[0].symbol).toBe("005930");
    expect(result.tiles[0].price).toBe(72000);
  });

  it("should fallback to static default snapshot if file is invalid JSON or schema validation fails", async () => {
    // Schema invalid data (missing universeId, generatedAt, etc.)
    const invalidSnapshot = {
      somethingElse: "invalid"
    };

    vi.spyOn(fs, "readFile").mockResolvedValue(JSON.stringify(invalidSnapshot));

    const result = await loadMarketBoardSnapshot("KOSPI_SAMPLE");
    
    // Result should match getDefaultSnapshot("KOSPI_SAMPLE")
    const staticDefault = getDefaultSnapshot("KOSPI_SAMPLE");
    expect(result.universeId).toBe("KOSPI_SAMPLE");
    expect(result.tiles.length).toBe(staticDefault.tiles.length);
    expect(result.tiles[0].symbol).toBe("005930");
  });

  it("should fallback to static default snapshot if file reading fails", async () => {
    vi.spyOn(fs, "readFile").mockRejectedValue(new Error("File not found"));

    const result = await loadMarketBoardSnapshot("KOSPI_SAMPLE");
    expect(result.universeId).toBe("KOSPI_SAMPLE");
    expect(result.tiles[0].symbol).toBe("005930");
  });
});
