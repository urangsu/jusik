import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchOpenDartDisclosures } from "./disclosure-search-client";
import { requestOpenDartJson } from "./opendart-http-client";
import { getOpenDartConfig } from "./opendart-config";

vi.mock("./opendart-config", () => ({
  getOpenDartConfig: vi.fn(),
}));

vi.mock("./opendart-http-client", () => ({
  requestOpenDartJson: vi.fn(),
}));

describe("searchOpenDartDisclosures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return api_required status if OpenDART is disabled", async () => {
    vi.mocked(getOpenDartConfig).mockReturnValue({
      enabled: false,
      apiKey: null,
      baseUrl: "https://opendart.fss.or.kr/api",
      pageCount: 100,
      timeoutMs: 10000,
      cacheTtlMinutes: 30,
    });

    const res = await searchOpenDartDisclosures({
      corpCode: "00126380",
    });

    expect(res.status).toBe("api_required");
    expect(res.value).toBeNull();
  });

  it("should throw an error if corpCode is not 8 digits long", async () => {
    vi.mocked(getOpenDartConfig).mockReturnValue({
      enabled: true,
      apiKey: "valid_key",
      baseUrl: "https://opendart.fss.or.kr/api",
      pageCount: 100,
      timeoutMs: 10000,
      cacheTtlMinutes: 30,
    });

    await expect(
      searchOpenDartDisclosures({
        corpCode: "123",
      })
    ).rejects.toThrow("corpCode는 반드시 8자리여야 합니다.");
  });

  it("should throw an error if date format is invalid", async () => {
    vi.mocked(getOpenDartConfig).mockReturnValue({
      enabled: true,
      apiKey: "valid_key",
      baseUrl: "https://opendart.fss.or.kr/api",
      pageCount: 100,
      timeoutMs: 10000,
      cacheTtlMinutes: 30,
    });

    await expect(
      searchOpenDartDisclosures({
        corpCode: "00126380",
        beginDate: "2026-01-01",
      })
    ).rejects.toThrow("beginDate는 YYYYMMDD 형식이어야 합니다.");
  });

  it("should throw an error if date range exceeds 3 months without corpCode", async () => {
    vi.mocked(getOpenDartConfig).mockReturnValue({
      enabled: true,
      apiKey: "valid_key",
      baseUrl: "https://opendart.fss.or.kr/api",
      pageCount: 100,
      timeoutMs: 10000,
      cacheTtlMinutes: 30,
    });

    await expect(
      searchOpenDartDisclosures({
        beginDate: "20260101",
        endDate: "20260501", // 4 months
      })
    ).rejects.toThrow("corpCode가 없는 경우 검색 기간은 최대 3개월을 초과할 수 없습니다.");
  });

  it("should return correct mapped disclosures on success", async () => {
    vi.mocked(getOpenDartConfig).mockReturnValue({
      enabled: true,
      apiKey: "valid_key",
      baseUrl: "https://opendart.fss.or.kr/api",
      pageCount: 100,
      timeoutMs: 10000,
      cacheTtlMinutes: 30,
    });

    vi.mocked(requestOpenDartJson).mockResolvedValue({
      status: "000",
      message: "정상",
      total_count: "2",
      total_page: "1",
      list: [
        {
          corp_cls: "Y",
          corp_name: "삼성전자",
          corp_code: "00126380",
          stock_code: "005930",
          report_nm: "분기보고서",
          rcept_no: "12345",
          flr_nm: "삼성전자",
          rcept_dt: "20260515",
          rm: "",
        },
      ],
    } as any);

    const res = await searchOpenDartDisclosures({
      corpCode: "00126380",
      beginDate: "20260101",
      endDate: "20260331",
    });

    expect(res.status).toBe("eod");
    expect(res.value?.list.length).toBe(1);
    expect(res.value?.list[0].corp_name).toBe("삼성전자");
  });

  it("should handle not_found (013) status gracefully", async () => {
    vi.mocked(getOpenDartConfig).mockReturnValue({
      enabled: true,
      apiKey: "valid_key",
      baseUrl: "https://opendart.fss.or.kr/api",
      pageCount: 100,
      timeoutMs: 10000,
      cacheTtlMinutes: 30,
    });

    vi.mocked(requestOpenDartJson).mockResolvedValue({
      status: "013",
      message: "조회된 데이터가 없습니다.",
    } as any);

    const res = await searchOpenDartDisclosures({
      corpCode: "00126380",
    });

    expect(res.status).toBe("not_found");
    expect(res.value?.list).toEqual([]);
    expect(res.value?.totalCount).toBe(0);
  });

  it("should handle rate_limited status correctly", async () => {
    vi.mocked(getOpenDartConfig).mockReturnValue({
      enabled: true,
      apiKey: "valid_key",
      baseUrl: "https://opendart.fss.or.kr/api",
      pageCount: 100,
      timeoutMs: 10000,
      cacheTtlMinutes: 30,
    });

    vi.mocked(requestOpenDartJson).mockResolvedValue({
      status: "020",
      message: "요청 제한을 초과하였습니다.",
    } as any);

    const res = await searchOpenDartDisclosures({
      corpCode: "00126380",
    });

    expect(res.status).toBe("rate_limited");
    expect(res.value).toBeNull();
  });
});
