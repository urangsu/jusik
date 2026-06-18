import { describe, it, expect, vi } from "vitest";
import { detectNewFilingEvents } from "./filing-event-detector";
import { getRecentFilings } from "../../filings/filing-event-store";
import { FilingEvent } from "../../../domain/filings/filing-event";

vi.mock("../../filings/filing-event-store", () => ({
  getRecentFilings: vi.fn(),
}));

describe("filing-event-detector", () => {
  it("should return empty array when no filings are returned", async () => {
    vi.mocked(getRecentFilings).mockResolvedValue([]);
    const events = await detectNewFilingEvents({});
    expect(events).toEqual([]);
  });

  it("should map filing events to alert events correctly, assigning watch severity for B/C/D type disclosures", async () => {
    const filings: any[] = [
      {
        id: "filing-1",
        receiptNo: "20260618000001",
        corpCode: "00126380",
        corpName: "삼성전자",
        stockCode: "005930",
        reportName: "반기보고서",
        disclosureType: "A",
        receiptDate: "2026-06-18",
        dataAvailableAt: "2026-06-18T09:00:00Z",
        createdAt: "2026-06-18T09:00:00Z",
        source: "OpenDART",
        sourceTier: "official",
        dataStatus: "real_time",
        warnings: [],
      },
      {
        id: "filing-2",
        receiptNo: "20260618000002",
        corpCode: "00126380",
        corpName: "삼성전자",
        stockCode: "005930",
        reportName: "주요사항보고서",
        disclosureType: "B",
        receiptDate: "2026-06-18",
        dataAvailableAt: "2026-06-18T09:10:00Z",
        createdAt: "2026-06-18T09:10:00Z",
        source: "OpenDART",
        sourceTier: "official",
        dataStatus: "real_time",
        warnings: ["unofficial"],
      },
    ];

    vi.mocked(getRecentFilings).mockResolvedValue(filings as any);

    const events = await detectNewFilingEvents({});
    expect(events).toHaveLength(2);

    expect(events[0].id).toBe("evt-filing-20260618000001");
    expect(events[0].ruleType).toBe("new_filing");
    expect(events[0].severity).toBe("info");
    expect(events[0].titleKo).toBe("[신규 공시] 삼성전자");
    expect(events[0].messageKo).toContain("반기보고서");

    expect(events[1].id).toBe("evt-filing-20260618000002");
    expect(events[1].severity).toBe("watch");
    expect(events[1].messageKo).toContain("주요사항보고서");
    expect(events[1].warnings).toContain("unofficial");
  });

  it("should filter events based on 'since' parameter", async () => {
    const filings: any[] = [
      {
        id: "filing-1",
        receiptNo: "20260618000001",
        corpCode: "00126380",
        corpName: "삼성전자",
        stockCode: "005930",
        reportName: "반기보고서",
        disclosureType: "A",
        receiptDate: "2026-06-18",
        dataAvailableAt: "2026-06-18T09:00:00Z",
        createdAt: "2026-06-18T09:00:00Z",
        source: "OpenDART",
        sourceTier: "official",
        dataStatus: "real_time",
        warnings: [],
      },
    ];

    vi.mocked(getRecentFilings).mockResolvedValue(filings as any);

    // filing createdAt is 2026-06-18T09:00:00Z.
    // if 'since' is 2026-06-18T08:59:59Z, it should be matched.
    const matched = await detectNewFilingEvents({ since: "2026-06-18T08:59:59Z" });
    expect(matched).toHaveLength(1);

    // if 'since' is 2026-06-18T09:00:01Z, it should be empty.
    const empty = await detectNewFilingEvents({ since: "2026-06-18T09:00:01Z" });
    expect(empty).toHaveLength(0);
  });
});
