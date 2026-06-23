import { describe, it, expect, vi, beforeEach } from "vitest";
import { addWatchlistItem, listWatchlistItems, getWatchlistItemByAssetId, removeWatchlistItem, updateWatchlistItem } from "./watchlist-store";
import { WatchlistItem } from "@/domain/watchlist/watchlist-item";

(globalThis as any).__mockWatchlistItems = "[]";
(globalThis as any).__mockWatchlistEvents = "[]";

vi.mock("fs/promises", () => {
  return {
    default: {
      mkdir: vi.fn(),
      readFile: vi.fn(async (path: string) => {
        if (path.endsWith("items.json")) {
          return (globalThis as any).__mockWatchlistItems;
        }
        if (path.endsWith("events.json")) {
          return (globalThis as any).__mockWatchlistEvents;
        }
        return "[]";
      }),
      writeFile: vi.fn(async (path: string, content: string) => {
        if (path.endsWith("items.json.tmp") || path.endsWith("items.json")) {
          (globalThis as any).__mockWatchlistItems = content;
        } else if (path.endsWith("events.json.tmp") || path.endsWith("events.json")) {
          (globalThis as any).__mockWatchlistEvents = content;
        }
      }),
      rename: vi.fn(async (from, to) => {}),
      unlink: vi.fn(async () => {}),
    },
  };
});

describe("WatchlistStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__mockWatchlistItems = "[]";
    (globalThis as any).__mockWatchlistEvents = "[]";
  });

  const sampleItem: WatchlistItem = {
    id: "wl_KR_005930",
    assetId: "KR:005930",
    symbol: "005930",
    nameKo: "삼성전자",
    nameEn: "Samsung Electronics",
    market: "KR",
    universeId: "KOSPI_SAMPLE",
    tags: ["Tech", "LargeCap"],
    alertEnabled: true,
    reportInboxEnabled: true,
    createdAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-06-18T00:00:00Z",
  };

  it("should add and retrieve watchlist items", async () => {
    await addWatchlistItem(sampleItem);
    const items = await listWatchlistItems();
    expect(items).toHaveLength(1);
    expect(items[0].assetId).toBe("KR:005930");
  });

  it("should reject duplicate assetId", async () => {
    await addWatchlistItem(sampleItem);
    await expect(addWatchlistItem(sampleItem)).rejects.toThrow();
  });

  it("should get item by assetId", async () => {
    await addWatchlistItem(sampleItem);
    const item = await getWatchlistItemByAssetId("KR:005930");
    expect(item).not.toBeNull();
    expect(item?.symbol).toBe("005930");
  });

  it("should remove item", async () => {
    await addWatchlistItem(sampleItem);
    await removeWatchlistItem("KR:005930");
    const items = await listWatchlistItems();
    expect(items).toHaveLength(0);
  });

  it("should update item fields", async () => {
    await addWatchlistItem(sampleItem);
    const updated = await updateWatchlistItem("KR:005930", {
      reportInboxEnabled: false,
      tags: ["Tech"],
    });
    expect(updated.reportInboxEnabled).toBe(false);
    expect(updated.tags).toEqual(["Tech"]);
  });
});
