import { DataEnvelope } from "../../domain/common/data-status";
import { OpenDartDisclosureType } from "../../domain/opendart/opendart-disclosure-type";
import { mapOpenDartStatusToDataStatus } from "../../domain/opendart/opendart-status";
import { requestOpenDartJson } from "./opendart-http-client";
import { getOpenDartConfig } from "./opendart-config";

export type OpenDartDisclosureSearchParams = {
  corpCode?: string;
  beginDate?: string;
  endDate?: string;
  finalReportOnly?: boolean;
  disclosureType?: OpenDartDisclosureType;
  disclosureDetailType?: string;
  corpClass?: "Y" | "K" | "N" | "E";
  sort?: "date" | "crp" | "rpt";
  sortMethod?: "asc" | "desc";
  pageNo?: number;
  pageCount?: number;
};

export type OpenDartDisclosureListItem = {
  corp_cls: "Y" | "K" | "N" | "E";
  corp_name: string;
  corp_code: string;
  stock_code: string;
  report_nm: string;
  rcept_no: string;
  flr_nm: string;
  rcept_dt: string;
  rm: string;
};

export type OpenDartDisclosureSearchResult = {
  pageNo: number;
  pageCount: number;
  totalCount: number;
  totalPage: number;
  list: OpenDartDisclosureListItem[];
};

export async function searchOpenDartDisclosures(
  params: OpenDartDisclosureSearchParams
): Promise<DataEnvelope<OpenDartDisclosureSearchResult>> {
  const config = getOpenDartConfig();

  if (!config.enabled) {
    return {
      value: null,
      status: "api_required",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "OpenDART API가 비활성화되어 있거나 API Key가 설정되지 않았습니다.",
    };
  }

  // 1. Validation corpCode
  if (params.corpCode && params.corpCode.length !== 8) {
    throw new Error("corpCode는 반드시 8자리여야 합니다.");
  }

  // 2. Validation date format
  const dateRegex = /^\d{8}$/;
  if (params.beginDate && !dateRegex.test(params.beginDate)) {
    throw new Error("beginDate는 YYYYMMDD 형식이어야 합니다.");
  }
  if (params.endDate && !dateRegex.test(params.endDate)) {
    throw new Error("endDate는 YYYYMMDD 형식이어야 합니다.");
  }

  // 3. Validation date range (max 3 months if corpCode is missing)
  if (!params.corpCode && params.beginDate && params.endDate) {
    const begin = parseDateString(params.beginDate);
    const end = parseDateString(params.endDate);
    if (getMonthDiff(begin, end) > 3) {
      throw new Error("corpCode가 없는 경우 검색 기간은 최대 3개월을 초과할 수 없습니다.");
    }
  }

  // 4. Clamping parameters
  const pageNo = Math.max(1, params.pageNo || 1);
  const pageCount = Math.max(1, Math.min(100, params.pageCount || config.pageCount));
  const sort = params.sort || "date";
  const sortMethod = params.sortMethod || "desc";
  const lastReprtAt = params.finalReportOnly ? "Y" : "N";

  const queryParams: Record<string, string | number | undefined> = {
    corp_code: params.corpCode,
    bgn_de: params.beginDate,
    end_de: params.endDate,
    last_reprt_at: lastReprtAt,
    pblntf_ty: params.disclosureType,
    pblntf_detail_ty: params.disclosureDetailType,
    corp_cls: params.corpClass,
    sort,
    sort_mth: sortMethod,
    page_no: pageNo,
    page_count: pageCount,
  };

  try {
    const response = await requestOpenDartJson<{
      status: string;
      message: string;
      page_no?: string;
      page_count?: string;
      total_count?: string;
      total_page?: string;
      list?: OpenDartDisclosureListItem[];
    }>({
      path: "/list.json",
      query: queryParams,
    });

    const status = response.status || "900";
    const mappedStatus = mapOpenDartStatusToDataStatus(status);

    if (mappedStatus === "rate_limited") {
      return {
        value: null,
        status: "rate_limited",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
        message: response.message || "OpenDART API 한도 초과",
      };
    }

    if (mappedStatus === "not_found") {
      return {
        value: {
          pageNo,
          pageCount,
          totalCount: 0,
          totalPage: 0,
          list: [],
        },
        status: "not_found",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
      };
    }

    if (mappedStatus === "error") {
      return {
        value: null,
        status: "error",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
        message: response.message || `OpenDART API 오류: status=${status}`,
      };
    }

    const list = response.list || [];
    const totalCount = parseInt(response.total_count || "0", 10);
    const totalPage = parseInt(response.total_page || "0", 10);

    return {
      value: {
        pageNo,
        pageCount,
        totalCount,
        totalPage,
        list,
      },
      status: "eod",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      value: null,
      status: "error",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: err?.message || String(err),
    };
  }
}

function parseDateString(d: string): Date {
  const y = parseInt(d.substring(0, 4), 10);
  const m = parseInt(d.substring(4, 6), 10) - 1;
  const day = parseInt(d.substring(6, 8), 10);
  return new Date(y, m, day);
}

function getMonthDiff(d1: Date, d2: Date): number {
  return (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30.5);
}
