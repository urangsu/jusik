import path from "path";
import fs from "fs/promises";
import { FilingEvent } from "../../domain/filings/filing-event";
import { JsonFileStore } from "../storage/json-file-store";

const EVENTS_PATH = path.join(process.cwd(), "data", "filings", "events.json");
const LATEST_BY_STOCK_DIR = path.join(process.cwd(), "data", "filings", "latest-by-stock");

let storeInstance: JsonFileStore<FilingEvent[]> | null = null;

function getStore(): JsonFileStore<FilingEvent[]> {
  if (!storeInstance) {
    storeInstance = new JsonFileStore<FilingEvent[]>(EVENTS_PATH, []);
  }
  return storeInstance;
}

export async function saveFilingEvents(events: FilingEvent[]): Promise<void> {
  const dir = path.dirname(EVENTS_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.mkdir(LATEST_BY_STOCK_DIR, { recursive: true });

  const store = getStore();
  const existing = await store.read();

  const map = new Map<string, FilingEvent>();
  for (const ev of existing) {
    map.set(ev.receiptNo, ev);
  }
  for (const ev of events) {
    map.set(ev.receiptNo, ev);
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => b.receiptDate.localeCompare(a.receiptDate) || b.receiptNo.localeCompare(a.receiptNo));

  await store.write(merged);

  const byStock: Record<string, FilingEvent[]> = {};
  for (const ev of events) {
    if (ev.stockCode) {
      if (!byStock[ev.stockCode]) {
        byStock[ev.stockCode] = [];
      }
      byStock[ev.stockCode].push(ev);
    }
  }

  for (const [stockCode, stockEvents] of Object.entries(byStock)) {
    const stockPath = path.join(LATEST_BY_STOCK_DIR, `${stockCode}.json`);
    const stockStore = new JsonFileStore<FilingEvent[]>(stockPath, []);
    const existingStockEvents = await stockStore.read();

    const stockMap = new Map<string, FilingEvent>();
    for (const ev of existingStockEvents) {
      stockMap.set(ev.receiptNo, ev);
    }
    for (const ev of stockEvents) {
      stockMap.set(ev.receiptNo, ev);
    }

    const mergedStock = Array.from(stockMap.values());
    mergedStock.sort((a, b) => b.receiptDate.localeCompare(a.receiptDate) || b.receiptNo.localeCompare(a.receiptNo));
    
    await stockStore.write(mergedStock.slice(0, 100));
  }
}

export async function getRecentFilings(params: {
  stockCode?: string;
  corpCode?: string;
  limit?: number;
}): Promise<FilingEvent[]> {
  const limit = params.limit || 5;

  if (params.stockCode) {
    const stockPath = path.join(LATEST_BY_STOCK_DIR, `${params.stockCode}.json`);
    try {
      const stockStore = new JsonFileStore<FilingEvent[]>(stockPath, []);
      const events = await stockStore.read();
      return events.slice(0, limit);
    } catch {
      // Fallback
    }
  }

  const store = getStore();
  let events = await store.read();

  if (params.stockCode) {
    events = events.filter((e) => e.stockCode === params.stockCode);
  }
  if (params.corpCode) {
    events = events.filter((e) => e.corpCode === params.corpCode);
  }

  return events.slice(0, limit);
}

export async function getFilingByReceiptNo(receiptNo: string): Promise<FilingEvent | null> {
  const store = getStore();
  const events = await store.read();
  const event = events.find((e) => e.receiptNo === receiptNo);
  return event || null;
}
