import { describe, expect, it } from "vitest";
import type { SymbolMasterRecord } from "@/domain/symbols/symbol-master";
import { validateSymbolMasterImport } from "./symbol-master-import-validator";

function baseRecord(overrides: Partial<SymbolMasterRecord> = {}): SymbolMasterRecord {
  return {
    assetId: "KR_005930",
    symbol: "005930",
    market: "KR",
    exchange: "KOSPI",
    currency: "KRW",
    assetType: "common_stock",
    status: "active",
    source: "manual_import",
    updatedAt: "2026-07-05T00:00:00.000Z",
    ...overrides,
  };
}

describe("validateSymbolMasterImport", () => {
  it("rejects KR records without KR_ asset id prefix", () => {
    const result = validateSymbolMasterImport([baseRecord({ assetId: "005930" })]);

    expect(result.validRecords).toHaveLength(0);
    expect(result.rejectedRecords[0].reason).toContain("KR_");
  });

  it("rejects US records without US_ asset id prefix", () => {
    const result = validateSymbolMasterImport([
      baseRecord({ assetId: "AAPL", symbol: "AAPL", market: "US", currency: "USD" }),
    ]);

    expect(result.validRecords).toHaveLength(0);
    expect(result.rejectedRecords[0].reason).toContain("US_");
  });

  it("rejects records with mismatched market currency", () => {
    const result = validateSymbolMasterImport([
      baseRecord({ assetId: "KR_TEST", currency: "USD" }),
      baseRecord({ assetId: "US_TEST", market: "US", currency: "KRW" }),
    ]);

    expect(result.validRecords).toHaveLength(0);
    expect(result.rejectedRecords).toHaveLength(2);
  });

  it("accepts canonical KR and US records", () => {
    const result = validateSymbolMasterImport([
      baseRecord(),
      baseRecord({ assetId: "US_AAPL", symbol: "AAPL", market: "US", currency: "USD", exchange: "NASDAQ" }),
    ]);

    expect(result.validRecords).toHaveLength(2);
    expect(result.rejectedRecords).toHaveLength(0);
  });
});
