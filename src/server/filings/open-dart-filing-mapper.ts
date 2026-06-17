import { FilingEvent } from "../../domain/filings/filing-event";
import { OpenDartDisclosureListItem } from "../opendart/disclosure-search-client";
import { OpenDartDisclosureType } from "../../domain/opendart/opendart-disclosure-type";

export function mapOpenDartListItemToFilingEvent(params: {
  item: OpenDartDisclosureListItem;
  disclosureType?: OpenDartDisclosureType | null;
  disclosureDetailType?: string | null;
}): FilingEvent {
  const { item, disclosureType = null, disclosureDetailType = null } = params;

  const receiptNo = item.rcept_no;
  const id = `OpenDART_${receiptNo}`;
  const filingUrl = `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receiptNo}`;

  // Parse YYYYMMDD rcept_dt into ISO string
  let dataAvailableAt = new Date().toISOString();
  if (item.rcept_dt && item.rcept_dt.length === 8) {
    const y = item.rcept_dt.substring(0, 4);
    const m = item.rcept_dt.substring(4, 6);
    const d = item.rcept_dt.substring(6, 8);
    dataAvailableAt = `${y}-${m}-${d}T09:00:00+09:00`;
  }

  const stockCode = item.stock_code ? item.stock_code.trim() : null;

  return {
    id,
    provider: "OpenDART",
    corpClass: item.corp_cls,
    corpName: item.corp_name,
    corpCode: item.corp_code,
    stockCode: stockCode && stockCode.length > 0 ? stockCode : null,
    reportName: item.report_nm,
    receiptNo,
    filerName: item.flr_nm,
    receiptDate: item.rcept_dt,
    dataAvailableAt,
    filingUrl,
    remark: item.rm || null,
    disclosureType,
    disclosureDetailType,
    dataStatus: "cached",
    source: "OpenDART",
    sourceTier: "official",
    warnings: [],
    createdAt: new Date().toISOString(),
  };
}
