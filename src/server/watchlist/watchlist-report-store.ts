import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  WatchlistReportItem,
  WatchlistReportStatus,
  WatchlistReportCategory,
  WatchlistReportSeverity,
} from "@/domain/watchlist/watchlist-report-item";
import { WatchlistReportSourceType } from "@/domain/watchlist/watchlist-report-source";
import { writeAtomic } from "../storage/atomic-write";
import {
  getWatchlistReportsLatestPath,
  getWatchlistReportsEventsPath,
  getWatchlistReportByIdPath,
} from "./watchlist-report-store-paths";

export async function saveWatchlistReportItem(item: WatchlistReportItem): Promise<void> {
  const byIdPath = getWatchlistReportByIdPath(item.id);
  await fs.mkdir(path.dirname(byIdPath), { recursive: true });

  const latestPath = getWatchlistReportsLatestPath();
  await fs.mkdir(path.dirname(latestPath), { recursive: true });

  let latestItems: WatchlistReportItem[] = [];
  try {
    const raw = await fs.readFile(latestPath, "utf8");
    latestItems = JSON.parse(raw);
  } catch {
    // empty
  }

  const existingIndex = latestItems.findIndex((x) => x.dedupeKey === item.dedupeKey);
  if (existingIndex !== -1) {
    const existing = latestItems[existingIndex];
    const updatedItem: WatchlistReportItem = {
      ...item,
      id: existing.id, // preserve original ID
      status: existing.status, // preserve user read/archive status
      updatedAt: new Date().toISOString(),
    };
    latestItems[existingIndex] = updatedItem;

    const existingByIdPath = getWatchlistReportByIdPath(existing.id);
    await writeAtomic(existingByIdPath, JSON.stringify(updatedItem, null, 2));
  } else {
    latestItems.push(item);
    await writeAtomic(byIdPath, JSON.stringify(item, null, 2));
  }

  latestItems.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  await writeAtomic(latestPath, JSON.stringify(latestItems, null, 2));

  const eventsPath = getWatchlistReportsEventsPath();
  let events: any[] = [];
  try {
    const rawEvents = await fs.readFile(eventsPath, "utf8");
    events = JSON.parse(rawEvents);
  } catch {
    // empty
  }
  events.push({
    id: `ev_report_${crypto.randomUUID()}`,
    reportId: item.id,
    dedupeKey: item.dedupeKey,
    type: existingIndex !== -1 ? "updated" : "created",
    createdAt: new Date().toISOString(),
  });
  await writeAtomic(eventsPath, JSON.stringify(events, null, 2));
}

export async function listWatchlistReportItems(query?: {
  assetId?: string;
  symbol?: string;
  status?: "unread" | "read" | "archived" | "hidden";
  category?: WatchlistReportCategory;
  severity?: WatchlistReportSeverity;
  sourceType?: WatchlistReportSourceType;
  since?: string;
  until?: string;
  includeHidden?: boolean;
}): Promise<WatchlistReportItem[]> {
  const latestPath = getWatchlistReportsLatestPath();
  let items: WatchlistReportItem[] = [];
  try {
    const raw = await fs.readFile(latestPath, "utf8");
    items = JSON.parse(raw);
  } catch {
    return [];
  }

  if (query) {
    if (query.assetId) {
      items = items.filter((x) => x.assetId === query.assetId);
    }
    if (query.symbol) {
      items = items.filter((x) => x.symbol.toLowerCase() === query.symbol!.toLowerCase());
    }
    if (query.status) {
      items = items.filter((x) => x.status === query.status);
    } else if (!query.includeHidden) {
      items = items.filter((x) => x.status !== "hidden");
    }
    if (query.category) {
      items = items.filter((x) => x.category === query.category);
    }
    if (query.severity) {
      items = items.filter((x) => x.severity === query.severity);
    }
    if (query.sourceType) {
      items = items.filter((x) => x.source.sourceType === query.sourceType);
    }
    if (query.since) {
      items = items.filter((x) => x.detectedAt >= query.since!);
    }
    if (query.until) {
      items = items.filter((x) => x.detectedAt <= query.until!);
    }
  } else {
    items = items.filter((x) => x.status !== "hidden");
  }

  return items;
}

export async function getWatchlistReportItemById(id: string): Promise<WatchlistReportItem | null> {
  const p = getWatchlistReportByIdPath(id);
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch {
    const latestPath = getWatchlistReportsLatestPath();
    try {
      const rawLatest = await fs.readFile(latestPath, "utf8");
      const items: WatchlistReportItem[] = JSON.parse(rawLatest);
      return items.find((x) => x.id === id) || null;
    } catch {
      return null;
    }
  }
}

export async function updateWatchlistReportStatus(
  id: string,
  status: WatchlistReportStatus
): Promise<WatchlistReportItem | null> {
  const item = await getWatchlistReportItemById(id);
  if (!item) {
    return null;
  }

  const updated: WatchlistReportItem = {
    ...item,
    status,
    updatedAt: new Date().toISOString(),
  };

  const byIdPath = getWatchlistReportByIdPath(id);
  await fs.mkdir(path.dirname(byIdPath), { recursive: true });
  await writeAtomic(byIdPath, JSON.stringify(updated, null, 2));

  const latestPath = getWatchlistReportsLatestPath();
  let latestItems: WatchlistReportItem[] = [];
  try {
    const raw = await fs.readFile(latestPath, "utf8");
    latestItems = JSON.parse(raw);
  } catch {
    // ignore
  }

  const index = latestItems.findIndex((x) => x.id === id);
  if (index !== -1) {
    latestItems[index] = updated;
    await writeAtomic(latestPath, JSON.stringify(latestItems, null, 2));
  }

  return updated;
}
