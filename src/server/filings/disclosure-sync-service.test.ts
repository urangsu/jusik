import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncRecentDisclosures } from "./disclosure-sync-service";
import { getCorpCodeByStockCode } from "../opendart/corp-code-store";
import { searchOpenDartDisclosures } from "../opendart/disclosure-search-client";
import { getFilingByReceiptNo, saveFilingEvents } from "./filing-event-store";

vi.mock("../opendart/corp-code-store", () => ({
  getCorpCodeByStockCode: vi.fn(),
}));

vi.mock("../opendart/disclosure-search-client", () => ({
  searchOpenDartDisclosures: vi.fn(),
}));

vi.mock("./filing-event-store", () => ({
  getFilingByReceiptNo: vi.fn(),
  saveFilingEvents: vi.fn(),
}));

describe("Disclosure Sync Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return not_supported status for SP500_SAMPLE universe", async () => {
    const res = await syncRecentDisclosures({
      universeId: "SP500_SAMPLE",
      beginDate: "20260101",
      endDate: "20260331",
    });

    expect(res.status).toBe("not_supported");
    expect(res.value).toBeNull();
  });

  it("should throw error for corpCode without YYYYMMDD date format or when dates are empty", async () => {
    const res = await syncRecentDisclosures({
      beginDate: "",
      endDate: "20260331",
    });
    expect(res.status).toBe("error");
    expect(res.message).toContain("검색 기간(beginDate, endDate)은 YYYYMMDD 형식으로 필수 지정해야 합니다.");
  });

  it("should sync successfully for a single stock code", async () => {
    vi.mocked(getCorpCodeByStockCode).mockResolvedValue({
      corpCode: "00126380",
      corpName: "삼성전자",
      stockCode: "005930",
      modifyDate: "20260101",
      source: "OpenDART",
      sourceTier: "official",
      updatedAt: "2026-06-17",
    });

    vi.mocked(searchOpenDartDisclosures).mockResolvedValue({
      status: "eod",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      updatedAt: "2026-06-17",
      value: {
        pageNo: 1,
        pageCount: 100,
        totalCount: 1,
        totalPage: 1,
        list: [
          {
            corp_cls: "Y",
            corp_name: "삼성전자",
            corp_code: "00126380",
            stock_code: "005930",
            report_nm: "분기보고서",
            rcept_no: "20260515000001",
            flr_nm: "삼성전자",
            rcept_dt: "20260515",
            rm: "",
          },
        ],
      },
    });

    vi.mocked(getFilingByReceiptNo).mockResolvedValue(null);

    const res = await syncRecentDisclosures({
      stockCode: "005930",
      beginDate: "20260101",
      endDate: "20260331",
    });

    expect(res.status).toBe("eod");
    expect(res.value?.fetched).toBe(1);
    expect(res.value?.saved).toBe(1);
    expect(res.value?.skipped).toBe(0);
    expect(saveFilingEvents).toHaveBeenCalledTimes(1);
  });

  it("should skip already existing events", async () => {
    vi.mocked(getCorpCodeByStockCode).mockResolvedValue({
      corpCode: "00126380",
      corpName: "삼성전자",
      stockCode: "005930",
      modifyDate: "20260101",
      source: "OpenDART",
      sourceTier: "official",
      updatedAt: "2026-06-17",
    });

    vi.mocked(searchOpenDartDisclosures).mockResolvedValue({
      status: "eod",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      updatedAt: "2026-06-17",
      value: {
        pageNo: 1,
        pageCount: 100,
        totalCount: 1,
        totalPage: 1,
        list: [
          {
            corp_cls: "Y",
            corp_name: "삼성전자",
            corp_code: "00126380",
            stock_code: "005930",
            report_nm: "분기보고서",
            rcept_no: "20260515000001",
            flr_nm: "삼성전자",
            rcept_dt: "20260515",
            rm: "",
          },
        ],
      },
    });

    vi.mocked(getFilingByReceiptNo).mockResolvedValue({} as any);

    const res = await syncRecentDisclosures({
      stockCode: "005930",
      beginDate: "20260101",
      endDate: "20260331",
    });

    expect(res.status).toBe("eod");
    expect(res.value?.fetched).toBe(1);
    expect(res.value?.saved).toBe(0);
    expect(res.value?.skipped).toBe(1);
    expect(saveFilingEvents).toHaveBeenCalledTimes(1); // Still saves the list, duplicate filtering handles it
  });
});
