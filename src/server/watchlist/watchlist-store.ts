import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { WatchlistItem } from "@/domain/watchlist/watchlist-item";
import { WatchlistEvent } from "@/domain/watchlist/watchlist-event";
import { writeAtomic } from "../storage/atomic-write";
import { getWatchlistItemsPath, getWatchlistEventsPath } from "./watchlist-store-paths";

async function ensureDirectory(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readItems(): Promise<WatchlistItem[]> {
  const p = getWatchlistItemsPath();
  await ensureDirectory(p);
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function readEvents(): Promise<WatchlistEvent[]> {
  const p = getWatchlistEventsPath();
  await ensureDirectory(p);
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function logEvent(
  assetId: string,
  type: "added" | "removed" | "updated",
  payload: Record<string, any>
): Promise<void> {
  const events = await readEvents();
  const newEvent: WatchlistEvent = {
    id: `ev_${crypto.randomUUID()}`,
    assetId,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  events.push(newEvent);
  await writeAtomic(getWatchlistEventsPath(), JSON.stringify(events, null, 2));
}

export async function addWatchlistItem(item: WatchlistItem): Promise<void> {
  const items = await readItems();
  const exists = items.some((i) => i.assetId === item.assetId);
  if (exists) {
    throw new Error(`Asset '${item.assetId}' is already in the watchlist.`);
  }
  items.push(item);
  await writeAtomic(getWatchlistItemsPath(), JSON.stringify(items, null, 2));
  await logEvent(item.assetId, "added", item);
}

export async function listWatchlistItems(query?: {
  market?: "KR" | "US";
  tag?: string;
  reportInboxEnabled?: boolean;
}): Promise<WatchlistItem[]> {
  let items = await readItems();
  if (query) {
    if (query.market) {
      items = items.filter((i) => i.market === query.market);
    }
    if (query.tag) {
      items = items.filter((i) => i.tags.includes(query.tag!));
    }
    if (query.reportInboxEnabled !== undefined) {
      items = items.filter((i) => i.reportInboxEnabled === query.reportInboxEnabled);
    }
  }
  return items;
}

export async function getWatchlistItemByAssetId(assetId: string): Promise<WatchlistItem | null> {
  const items = await readItems();
  return items.find((i) => i.assetId === assetId) || null;
}

export async function removeWatchlistItem(assetId: string): Promise<void> {
  const items = await readItems();
  const initialLength = items.length;
  const filtered = items.filter((i) => i.assetId !== assetId);
  if (filtered.length === initialLength) {
    return;
  }
  await writeAtomic(getWatchlistItemsPath(), JSON.stringify(filtered, null, 2));
  await logEvent(assetId, "removed", { assetId });
}

export async function updateWatchlistItem(
  assetId: string,
  patch: Partial<Pick<WatchlistItem, "tags" | "alertEnabled" | "reportInboxEnabled">>
): Promise<WatchlistItem> {
  const items = await readItems();
  const index = items.findIndex((i) => i.assetId === assetId);
  if (index === -1) {
    throw new Error(`Asset '${assetId}' not found in watchlist.`);
  }
  const original = items[index];
  const updated: WatchlistItem = {
    ...original,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  items[index] = updated;
  await writeAtomic(getWatchlistItemsPath(), JSON.stringify(items, null, 2));
  await logEvent(assetId, "updated", { patch });
  return updated;
}
