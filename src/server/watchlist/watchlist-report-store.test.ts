import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveWatchlistReportItem,
  listWatchlistReportItems,
  updateWatchlistReportStatus,
} from "./watchlist-report-store";
import { WatchlistReportItem } from "@/domain/watchlist/watchlist-report-item";

(globalThis as any).__mockReportsLatest = "[]";
(globalThis as any).__mockReportsEvents = "[]";
(globalThis as any).__mockReportsById = {};

vi.mock("fs/promises", () => {
  return {
    default: {
      mkdir: vi.fn(),
      readFile: vi.fn(async (path: string) => {
        if (path.endsWith("latest.json")) {
          return (globalThis as any).__mockReportsLatest;
        }
        if (path.endsWith("events.json")) {
          return (globalThis as any).__mockReportsEvents;
        }
        const matches = path.match(/by-id\/([^/]+)\.json/);
        if (matches) {
          const id = matches[1];
          const val = (globalThis as any).__mockReportsById[id];
          if (val) return val;
        }
        throw new Error("ENOENT");
      }),
      writeFile: vi.fn(async (path: string, content: string) => {
        if (path.endsWith("latest.json.tmp") || path.endsWith("latest.json")) {
          (globalThis as any).__mockReportsLatest = content;
        } else if (path.endsWith("events.json.tmp") || path.endsWith("events.json")) {
          (globalThis as any).__mockReportsEvents = content;
        } else {
          const matches = path.match(/by-id\/([^/]+)\.json/);
          if (matches) {
            const id = matches[1];
            (globalThis as any).__mockReportsById[id] = content;
          }
        }
      }),
      rename: vi.fn(async (from, to) => {}),
      unlink: vi.fn(async () => {}),
    },
  };
});

describe("WatchlistReportStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__mockReportsLatest = "[]";
    (globalThis as any).__mockReportsEvents = "[]";
    (globalThis as any).__mockReportsById = {};
  });

  const sampleReport: WatchlistReportItem = {
    id: "rep-123",
    assetId: "KR:005930",
    symbol: "005930",
    assetName: "삼성전자",
    title: "Test Report",
    summary: "Short summary",
    category: "filing",
    severity: "info",
    source: {
      sourceType: "opendart_filing",
      sourceId: "filing-123",
      sourceTitle: "OpenDART filing",
      sourceUrl: "http://example.com",
      internalUrl: null,
      sourceTier: "official",
      warnings: [],
      publishedAt: "2026-06-18T00:00:00Z",
      capturedAt: "2026-06-18T00:00:00Z",
    },
    status: "unread",
    tags: [],
    detectedAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-06-18T00:00:00Z",
    dedupeKey: "KR:005930|opendart_filing|filing-123",
  };

  it("should save and load report items", async () => {
    await saveWatchlistReportItem(sampleReport);
    const reports = await listWatchlistReportItems();
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe("rep-123");
  });

  it("should deduplicate reports with the same dedupeKey and keep status", async () => {
    await saveWatchlistReportItem(sampleReport);
    
    // update status of saved report
    await updateWatchlistReportStatus("rep-123", "archived");

    const duplicateReport: WatchlistReportItem = {
      ...sampleReport,
      id: "rep-456",
      summary: "Updated summary text",
    };

    await saveWatchlistReportItem(duplicateReport);
    
    const reports = await listWatchlistReportItems({ includeHidden: true });
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe("rep-123"); // original ID preserved
    expect(reports[0].summary).toBe("Updated summary text"); // updated info
    expect(reports[0].status).toBe("archived"); // user-set status preserved!
  });

  it("should update status", async () => {
    await saveWatchlistReportItem(sampleReport);
    const updated = await updateWatchlistReportStatus("rep-123", "read");
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe("read");

    const reports = await listWatchlistReportItems();
    expect(reports[0].status).toBe("read");
  });
});
