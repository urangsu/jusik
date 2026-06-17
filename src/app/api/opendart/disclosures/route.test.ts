import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { searchOpenDartDisclosures } from "../../../../server/opendart/disclosure-search-client";
import { getCorpCodeByStockCode } from "../../../../server/opendart/corp-code-store";

vi.mock("../../../../server/opendart/disclosure-search-client", () => ({
  searchOpenDartDisclosures: vi.fn(),
}));

vi.mock("../../../../server/opendart/corp-code-store", () => ({
  getCorpCodeByStockCode: vi.fn(),
}));

describe("GET /api/opendart/disclosures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 if stockCode is provided but has no mapped corpCode", async () => {
    vi.mocked(getCorpCodeByStockCode).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/opendart/disclosures?stockCode=999999");
    const response = await GET(request);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.status).toBe("not_found");
    expect(searchOpenDartDisclosures).not.toHaveBeenCalled();
  });

  it("calls searchOpenDartDisclosures and returns result", async () => {
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
        pageCount: 10,
        totalCount: 1,
        totalPage: 1,
        list: [],
      },
    });

    const request = new NextRequest(
      "http://localhost/api/opendart/disclosures?stockCode=005930&beginDate=20260101&endDate=20260331"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe("eod");
    expect(searchOpenDartDisclosures).toHaveBeenCalledWith({
      corpCode: "00126380",
      beginDate: "20260101",
      endDate: "20260331",
      disclosureType: undefined,
      finalReportOnly: false,
      pageNo: undefined,
      pageCount: undefined,
    });
  });
});
