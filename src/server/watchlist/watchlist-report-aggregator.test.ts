import { describe, it, expect, vi, beforeEach } from "vitest";
import { aggregateWatchlistReports } from "./watchlist-report-aggregator";
import { listWatchlistItems } from "./watchlist-store";
import { saveWatchlistReportItem } from "./watchlist-report-store";
import { listSignalPostmortems } from "../strategy/signal-postmortem-store";
import { alertEventStore } from "../alerts/alert-event-store";
import { getRecentFilings } from "../filings/filing-event-store";

vi.mock("./watchlist-store", () => ({
  listWatchlistItems: vi.fn(),
}));

vi.mock("./watchlist-report-store", () => ({
  saveWatchlistReportItem: vi.fn(),
  listWatchlistReportItems: vi.fn(() => []),
}));

vi.mock("../strategy/signal-postmortem-store", () => ({
  listSignalPostmortems: vi.fn(),
}));

vi.mock("../alerts/alert-event-store", () => ({
  alertEventStore: {
    getAlertEvents: vi.fn(),
  },
}));

vi.mock("../filings/filing-event-store", () => ({
  getRecentFilings: vi.fn(),
}));

describe("WatchlistReportAggregator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockWatchlist = [
    {
      id: "wl_1",
      assetId: "KR:005930",
      symbol: "005930",
      nameKo: "삼성전자",
      nameEn: "Samsung Electronics",
      market: "KR",
      universeId: "KOSPI_SAMPLE",
      tags: [],
      alertEnabled: true,
      reportInboxEnabled: true,
      createdAt: "2026-06-18",
      updatedAt: "2026-06-18",
    },
    {
      id: "wl_2",
      assetId: "US:AAPL",
      symbol: "AAPL",
      nameKo: "애플",
      nameEn: "Apple",
      market: "US",
      universeId: "SP500_SAMPLE",
      tags: [],
      alertEnabled: true,
      reportInboxEnabled: false, // report inbox disabled
      createdAt: "2026-06-18",
      updatedAt: "2026-06-18",
    },
  ];

  it("should aggregate nothing if watchlist is empty or reportInboxEnabled is false", async () => {
    vi.mocked(listWatchlistItems).mockResolvedValue([]);
    const res = await aggregateWatchlistReports();
    expect(res.created).toBe(0);
    expect(res.items).toHaveLength(0);
  });

  it("should aggregate SignalPostmortem correctly, mapping outcome to severity", async () => {
    vi.mocked(listWatchlistItems).mockResolvedValue(mockWatchlist.filter((w) => w.reportInboxEnabled) as any);
    vi.mocked(listSignalPostmortems).mockResolvedValue([
      {
        id: "pm-1",
        assetId: "KR:005930",
        symbol: "005930",
        strategyId: "momentum_v1_long_only",
        universeId: "KOSPI_SAMPLE",
        windowIndex: 1,
        testStart: "2026-06-01",
        testEnd: "2026-06-10",
        rank: 1,
        signalScore: 0.8,
        outcome: "negative", // maps to warning
        grossReturn: -0.05,
        netReturn: -0.055,
        dataWarnings: ["test1"],
        biasWarnings: ["test2"],
        createdAt: "2026-06-18T00:00:00Z",
        updatedAt: "2026-06-18T00:00:00Z",
      },
      {
        id: "pm-2",
        assetId: "US:AAPL", // AAPL has reportInboxEnabled = false
        symbol: "AAPL",
        outcome: "positive",
        createdAt: "2026-06-18T00:00:00Z",
      },
    ] as any);
    vi.mocked(alertEventStore.getAlertEvents).mockResolvedValue([]);
    vi.mocked(getRecentFilings).mockResolvedValue([]);

    const res = await aggregateWatchlistReports();

    // Only KR:005930 should be aggregated because AAPL reportInboxEnabled = false
    expect(res.created).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].severity).toBe("warning");
    expect(res.items[0].category).toBe("internal_research");
    expect(res.items[0].source.sourceType).toBe("signal_postmortem");
    expect(vi.mocked(saveWatchlistReportItem)).toHaveBeenCalledTimes(1);
  });

  it("should aggregate AlertEvent mapping categories and severity correctly", async () => {
    vi.mocked(listWatchlistItems).mockResolvedValue(mockWatchlist.filter((w) => w.reportInboxEnabled) as any);
    vi.mocked(listSignalPostmortems).mockResolvedValue([]);
    vi.mocked(alertEventStore.getAlertEvents).mockResolvedValue([
      {
        id: "alert-1",
        assetId: "KR:005930",
        symbol: "005930",
        ruleType: "technical_signal_change", // maps to signal
        severity: "critical", // matches directly
        titleKo: "신호 변경 경고",
        messageKo: "전략 신호가 변경되었습니다.",
        occurredAt: "2026-06-18T00:00:00Z",
        createdAt: "2026-06-18T00:00:00Z",
        warnings: [],
      },
    ] as any);
    vi.mocked(getRecentFilings).mockResolvedValue([]);

    const res = await aggregateWatchlistReports();

    expect(res.created).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].category).toBe("signal");
    expect(res.items[0].severity).toBe("critical");
    expect(res.items[0].source.internalUrl).toBe("/alerts");
  });

  it("should aggregate OpenDART filings by stockCode and keyword-severity evaluation", async () => {
    vi.mocked(listWatchlistItems).mockResolvedValue(mockWatchlist.filter((w) => w.reportInboxEnabled) as any);
    vi.mocked(listSignalPostmortems).mockResolvedValue([]);
    vi.mocked(alertEventStore.getAlertEvents).mockResolvedValue([]);
    vi.mocked(getRecentFilings).mockResolvedValue([
      {
        id: "filing-1",
        stockCode: "005930", // maps to KR:005930
        reportName: "횡령 배임 혐의 발생 보고", // critical severity keyword
        corpName: "삼성전자",
        receiptDate: "20260618",
        dataAvailableAt: "2026-06-18T00:00:00Z",
        createdAt: "2026-06-18T00:00:00Z",
        filingUrl: "http://dart.fss.or.kr/123",
        warnings: [],
      },
    ] as any);

    const res = await aggregateWatchlistReports();

    expect(res.created).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].severity).toBe("critical");
    expect(res.items[0].category).toBe("filing");
    expect(res.items[0].source.sourceUrl).toBe("http://dart.fss.or.kr/123");
  });
});
