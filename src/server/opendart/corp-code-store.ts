import path from "path";
import fs from "fs/promises";
import { OpenDartCorpCodeRecord } from "../../domain/opendart/corp-code";
import { JsonFileStore } from "../storage/json-file-store";

const CORP_CODES_PATH = path.join(process.cwd(), "data", "opendart", "corp-codes.json");

let storeInstance: JsonFileStore<OpenDartCorpCodeRecord[]> | null = null;

function getStore(): JsonFileStore<OpenDartCorpCodeRecord[]> {
  if (!storeInstance) {
    storeInstance = new JsonFileStore<OpenDartCorpCodeRecord[]>(CORP_CODES_PATH, []);
  }
  return storeInstance;
}

export async function saveCorpCodes(records: OpenDartCorpCodeRecord[]): Promise<void> {
  const dir = path.dirname(CORP_CODES_PATH);
  await fs.mkdir(dir, { recursive: true });
  
  const store = getStore();
  const existing = await store.read();
  
  const map = new Map<string, OpenDartCorpCodeRecord>();
  for (const r of existing) {
    map.set(r.corpCode, r);
  }
  for (const r of records) {
    map.set(r.corpCode, r);
  }
  
  await store.write(Array.from(map.values()));
}

export async function getCorpCodeByStockCode(stockCode: string): Promise<OpenDartCorpCodeRecord | null> {
  const store = getStore();
  const records = await store.read();
  const cleanStockCode = stockCode.trim();
  const record = records.find((r) => r.stockCode === cleanStockCode);
  return record || null;
}

export async function getCorpCodeByCorpCode(corpCode: string): Promise<OpenDartCorpCodeRecord | null> {
  const store = getStore();
  const records = await store.read();
  const cleanCorpCode = corpCode.trim();
  const record = records.find((r) => r.corpCode === cleanCorpCode);
  return record || null;
}

export async function searchCorpCodes(query: string): Promise<OpenDartCorpCodeRecord[]> {
  const store = getStore();
  const records = await store.read();
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];
  return records.filter(
    (r) =>
      r.corpName.toLowerCase().includes(cleanQuery) ||
      (r.stockCode && r.stockCode.includes(cleanQuery)) ||
      r.corpCode.includes(cleanQuery)
  );
}
