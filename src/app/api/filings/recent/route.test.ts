import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { getRecentFilings } from "../../../../server/filings/filing-event-store";

vi.mock("../../../../server/filings/filing-event-store", () => ({
  getRecentFilings: vi.fn(),
}));

describe("GET /api/filings/recent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls getRecentFilings and returns cached list on success", async () => {
    vi.mocked(getRecentFilings).mockResolvedValue([
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
    ]);

    const request = new NextRequest("http://localhost/api/filings/recent?stockCode=005930&limit=5");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("cached");
    expect(json.value.length).toBe(1);
    expect(json.value[0].receiptNo).toBe("1");
    expect(getRecentFilings).toHaveBeenCalledWith({
      stockCode: "005930",
      limit: 5,
    });
  });

  it("returns 500 error if filing store throws error", async () => {
    vi.mocked(getRecentFilings).mockRejectedValue(new Error("Store read failed"));

    const request = new NextRequest("http://localhost/api/filings/recent");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.status).toBe("error");
    expect(json.message).toBe("Store read failed");
  });
});
