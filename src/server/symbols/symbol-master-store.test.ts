import { beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  getSymbolMasterRecord,
  importSymbolMasterRecords,
  searchSymbolMaster,
} from "./symbol-master-store";

describe("symbol-master-store", () => {
  beforeEach(async () => {
    process.env.JUSIK_TEST_DATA_ROOT = await fs.mkdtemp(path.join(os.tmpdir(), "symbol-master-"));
  });

  it("maps Samsung symbol to assetId and OpenDART corpCode", async () => {
    const record = await getSymbolMasterRecord("KR_005930");

    expect(record?.symbol).toBe("005930");
    expect(record?.nameKo).toBe("삼성전자");
    expect(record?.corpCode).toBe("00126380");
  });

  it("maps AAPL to US asset identity", async () => {
    const result = await searchSymbolMaster("AAPL");

    expect(result.records[0].assetId).toBe("US_AAPL");
    expect(result.records[0].currency).toBe("USD");
  });

  it("imports manual records without replacing seed records by symbol only", async () => {
    const result = await importSymbolMasterRecords([
      {
        assetId: "US_MSFT",
        symbol: "MSFT",
        market: "US",
        exchange: "NASDAQ",
        nameEn: "Microsoft",
        currency: "USD",
        assetType: "common_stock",
        status: "active",
        source: "manual_import",
        updatedAt: "2026-07-02T00:00:00.000Z",
      },
    ]);

    expect(result).toEqual({ imported: 1, rejected: 0 });
    await expect(getSymbolMasterRecord("US_MSFT")).resolves.toMatchObject({ symbol: "MSFT" });
    await expect(getSymbolMasterRecord("AAPL")).resolves.toBeNull();
  });

  it("rejects non-canonical imported asset ids", async () => {
    const result = await importSymbolMasterRecords([
      {
        assetId: "AAPL",
        symbol: "AAPL",
        market: "US",
        exchange: "NASDAQ",
        currency: "USD",
        assetType: "common_stock",
        status: "active",
        source: "manual_import",
        updatedAt: "2026-07-05T00:00:00.000Z",
      },
    ]);

    expect(result.imported).toBe(0);
    expect(result.rejected).toBe(1);
  });
});
