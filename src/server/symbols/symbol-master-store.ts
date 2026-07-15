import fs from "fs/promises";
import path from "path";
import type { SymbolMasterRecord, SymbolSearchResult } from "@/domain/symbols/symbol-master";
import { resolveRuntimeDataPath } from "@/server/storage/runtime-store-root";
import { writeAtomic } from "@/server/storage/atomic-write";
import { validateSymbolMasterImport } from "./symbol-master-import-validator";

const SEED_UPDATED_AT = "2026-07-02T00:00:00.000Z";

const SEED_SYMBOLS: SymbolMasterRecord[] = [
  {
    assetId: "KR_005930",
    symbol: "005930",
    market: "KR",
    exchange: "KOSPI",
    nameKo: "삼성전자",
    nameEn: "Samsung Electronics",
    sector: "Information Technology",
    industry: "Semiconductors",
    currency: "KRW",
    assetType: "common_stock",
    corpCode: "00126380",
    isin: "KR7005930003",
    status: "active",
    source: "seed",
    updatedAt: SEED_UPDATED_AT,
    // Seed metadata only — not live truth
    marketBenchmarkId: "KR_INDEX_KOSPI",
    sectorBenchmarkId: "KR_INDEX_KRX_SEMICONDUCTOR",
  },
  {
    assetId: "US_AAPL",
    symbol: "AAPL",
    market: "US",
    exchange: "NASDAQ",
    nameKo: "애플",
    nameEn: "Apple Inc.",
    sector: "Information Technology",
    industry: "Consumer Electronics",
    currency: "USD",
    assetType: "common_stock",
    cik: "0000320193",
    status: "active",
    source: "seed",
    updatedAt: SEED_UPDATED_AT,
    // Seed metadata only — not live truth
    marketBenchmarkId: "US_SPY",
    sectorBenchmarkId: "US_XLK",
  },
];

function symbolMasterPath(): string {
  return resolveRuntimeDataPath("data", "symbols", "symbol-master.json");
}

async function readManualRecords(): Promise<SymbolMasterRecord[]> {
  try {
    const raw = await fs.readFile(symbolMasterPath(), "utf8");
    return JSON.parse(raw) as SymbolMasterRecord[];
  } catch {
    return [];
  }
}

async function writeManualRecords(records: SymbolMasterRecord[]): Promise<void> {
  const filePath = symbolMasterPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await writeAtomic(filePath, JSON.stringify(records, null, 2));
}

export async function listSymbolMasterRecords(): Promise<SymbolMasterRecord[]> {
  const manual = await readManualRecords();
  const map = new Map<string, SymbolMasterRecord>();
  for (const record of SEED_SYMBOLS) map.set(record.assetId, record);
  for (const record of manual) map.set(record.assetId, record);
  return Array.from(map.values());
}

export async function getSymbolMasterRecord(assetId: string): Promise<SymbolMasterRecord | null> {
  const records = await listSymbolMasterRecords();
  return records.find((record) => record.assetId === assetId) ?? null;
}

export async function searchSymbolMaster(query: string): Promise<SymbolSearchResult> {
  const needle = query.trim().toLowerCase();
  const records = await listSymbolMasterRecords();
  const filtered = needle
    ? records.filter((record) =>
        [record.assetId, record.symbol, record.nameKo, record.nameEn, record.corpCode, record.cik]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle)),
      )
    : records;
  return { records: filtered, query, total: filtered.length };
}

export async function importSymbolMasterRecords(records: SymbolMasterRecord[]): Promise<{ imported: number; rejected: number }> {
  const validation = validateSymbolMasterImport(records);
  const existing = await readManualRecords();
  const map = new Map(existing.map((record) => [record.assetId, record]));
  for (const record of validation.validRecords) map.set(record.assetId, { ...record, source: record.source ?? "manual_import" });
  await writeManualRecords(Array.from(map.values()));
  return { imported: validation.validRecords.length, rejected: validation.rejectedRecords.length };
}
