import { describe, it, expect } from "vitest";
import { mapOpenDartListItemToFilingEvent } from "./open-dart-filing-mapper";
import { OpenDartDisclosureListItem } from "../opendart/disclosure-search-client";

describe("mapOpenDartListItemToFilingEvent", () => {
  it("should map raw OpenDART item to FilingEvent correctly", () => {
    const rawItem: OpenDartDisclosureListItem = {
      corp_cls: "Y",
      corp_name: "삼성전자",
      corp_code: "00126380",
      stock_code: "005930",
      report_nm: "분기보고서 (2026.03)",
      rcept_no: "20260515000001",
      flr_nm: "삼성전자",
      rcept_dt: "20260515",
      rm: "정",
    };

    const event = mapOpenDartListItemToFilingEvent({
      item: rawItem,
      disclosureType: "A",
    });

    expect(event.id).toBe("OpenDART_20260515000001");
    expect(event.provider).toBe("OpenDART");
    expect(event.corpClass).toBe("Y");
    expect(event.corpName).toBe("삼성전자");
    expect(event.corpCode).toBe("00126380");
    expect(event.stockCode).toBe("005930");
    expect(event.reportName).toBe("분기보고서 (2026.03)");
    expect(event.receiptNo).toBe("20260515000001");
    expect(event.filerName).toBe("삼성전자");
    expect(event.receiptDate).toBe("20260515");
    expect(event.dataAvailableAt).toBe("2026-05-15T09:00:00+09:00");
    expect(event.filingUrl).toBe("https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260515000001");
    expect(event.remark).toBe("정");
    expect(event.disclosureType).toBe("A");
  });

  it("should handle null/empty stock code and remark correctly", () => {
    const rawItem: OpenDartDisclosureListItem = {
      corp_cls: "N",
      corp_name: "비상장회사",
      corp_code: "00999999",
      stock_code: " ",
      report_nm: "감사보고서",
      rcept_no: "20260401000001",
      flr_nm: "회계법인",
      rcept_dt: "20260401",
      rm: "",
    };

    const event = mapOpenDartListItemToFilingEvent({
      item: rawItem,
    });

    expect(event.stockCode).toBeNull();
    expect(event.remark).toBeNull();
  });
});
