import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveFilingEvents, getRecentFilings, getFilingByReceiptNo } from "./filing-event-store";
import { FilingEvent } from "../../domain/filings/filing-event";

vi.mock("../storage/json-file-store", () => {
  return {
    JsonFileStore: class MockJsonFileStore {
      private filePath: string;
      private static dataMap = new Map<string, any>();

      constructor(filePath: string) {
        this.filePath = filePath;
      }

      async read() {
        return MockJsonFileStore.dataMap.get(this.filePath) || [];
      }

      async write(data: any) {
        MockJsonFileStore.dataMap.set(this.filePath, data);
      }

      static clearAll() {
        MockJsonFileStore.dataMap.clear();
      }
    },
  };
});

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
  },
}));

describe("Filing Event Store", () => {
  const mockEvents: FilingEvent[] = [
    {
      id: "OpenDART_1",
      provider: "OpenDART",
      corpClass: "Y",
      corpName: "삼성전자",
      corpCode: "00126380",
      stockCode: "005930",
      reportName: "분기보고서",
      receiptNo: "1",
      filerName: "삼성전자",
      receiptDate: "20260515",
      dataAvailableAt: "2026-05-15T09:00:00+09:00",
      filingUrl: "https://dart.fss.or.kr",
      createdAt: "2026-06-17",
      dataStatus: "cached",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      remark: null,
      disclosureType: null,
      disclosureDetailType: null,
    },
    {
      id: "OpenDART_2",
      provider: "OpenDART",
      corpClass: "Y",
      corpName: "삼성전자",
      corpCode: "00126380",
      stockCode: "005930",
      reportName: "대량보유보고",
      receiptNo: "2",
      filerName: "국민연금",
      receiptDate: "20260410",
      dataAvailableAt: "2026-04-10T09:00:00+09:00",
      filingUrl: "https://dart.fss.or.kr",
      createdAt: "2026-06-17",
      dataStatus: "cached",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      remark: null,
      disclosureType: null,
      disclosureDetailType: null,
    },
    {
      id: "OpenDART_3",
      provider: "OpenDART",
      corpClass: "Y",
      corpName: "SK하이닉스",
      corpCode: "00164779",
      stockCode: "000660",
      reportName: "반기보고서",
      receiptNo: "3",
      filerName: "SK하이닉스",
      receiptDate: "20260514",
      dataAvailableAt: "2026-05-14T09:00:00+09:00",
      filingUrl: "https://dart.fss.or.kr",
      createdAt: "2026-06-17",
      dataStatus: "cached",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      remark: null,
      disclosureType: null,
      disclosureDetailType: null,
    },
  ];

  beforeEach(async () => {
    const { JsonFileStore } = await import("../storage/json-file-store") as any;
    JsonFileStore.clearAll();
    await saveFilingEvents(mockEvents);
  });

  it("should save filing events and retrieve recent filings", async () => {
    const recent = await getRecentFilings({ limit: 10 });
    expect(recent.length).toBe(3);
    // Sort order should be receiptDate desc
    expect(recent[0].receiptNo).toBe("1"); // 20260515
    expect(recent[1].receiptNo).toBe("3"); // 20260514
    expect(recent[2].receiptNo).toBe("2"); // 20260410
  });

  it("should filter recent filings by stockCode", async () => {
    const stockEvents = await getRecentFilings({ stockCode: "005930", limit: 10 });
    expect(stockEvents.length).toBe(2);
    expect(stockEvents.map(e => e.receiptNo)).toContain("1");
    expect(stockEvents.map(e => e.receiptNo)).toContain("2");
  });

  it("should filter recent filings by corpCode", async () => {
    const corpEvents = await getRecentFilings({ corpCode: "00164779", limit: 10 });
    expect(corpEvents.length).toBe(1);
    expect(corpEvents[0].receiptNo).toBe("3");
  });

  it("should retrieve a filing by receiptNo", async () => {
    const filing = await getFilingByReceiptNo("2");
    expect(filing).not.toBeNull();
    expect(filing?.filerName).toBe("국민연금");
  });

  it("should deduplicate events based on receiptNo", async () => {
    const duplicateEvent = { ...mockEvents[0], reportName: "Updated Report Name" };
    await saveFilingEvents([duplicateEvent]);

    const recent = await getRecentFilings({ limit: 10 });
    expect(recent.length).toBe(3);
    const updated = await getFilingByReceiptNo("1");
    expect(updated?.reportName).toBe("Updated Report Name");
  });
});
