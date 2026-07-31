import { resolveProviderConfigSync } from "../settings/provider-config-resolver";
import { DataEnvelope } from "@/domain/common/data-status";

export type OpenDartSingleAcntAllItem = {
  rcept_no: string;
  reprt_code: string;
  bsns_year: string;
  corp_code: string;
  sj_div: string; // BS, IS, CIS, CF, SCE
  sj_nm: string;
  account_id: string;
  account_nm: string;
  account_detail?: string;
  thstrm_nm: string;
  thstrm_amount: string;
  thstrm_add_amount?: string;
  frmtrm_nm?: string;
  frmtrm_amount?: string;
};

export type OpenDartSingleAcntAllResponse = {
  status: string;
  message: string;
  list?: OpenDartSingleAcntAllItem[];
};

export async function fetchOpenDartFinancialStatements(params: {
  corpCode: string;
  bsnsYear: string;
  reprtCode: "11011" | "11012" | "11013" | "11014";
  fsDiv: "CFS" | "OFS";
}): Promise<DataEnvelope<OpenDartSingleAcntAllItem[]>> {
  const config = resolveProviderConfigSync("opendart");
  const apiKey = (config["OPENDART_API_KEY"] as string) || "";
  const baseUrl = (config["OPENDART_BASE_URL"] as string) || "https://opendart.fss.or.kr/api";

  if (!apiKey) {
    return {
      value: null,
      status: "api_required",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "OpenDART API Key가 설정되지 않았습니다.",
    };
  }

  const query = new URLSearchParams({
    crtfc_key: apiKey,
    corp_code: params.corpCode,
    bsns_year: params.bsnsYear,
    reprt_code: params.reprtCode,
    fs_div: params.fsDiv,
  });

  try {
    const res = await fetch(`${baseUrl}/fnlttSinglAcntAll.json?${query.toString()}`);
    if (res.status === 429) {
      return {
        value: null,
        status: "rate_limited",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: "OpenDART API 요청 한도를 초과했습니다.",
      };
    }

    if (!res.ok) {
      return {
        value: null,
        status: "error",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: `OpenDART HTTP error: ${res.status}`,
      };
    }

    const data = (await res.json()) as OpenDartSingleAcntAllResponse;

    if (data.status === "013" || !data.list || data.list.length === 0) {
      return {
        value: [],
        status: "not_found",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
        message: data.message || "해당 기간의 재무제표 데이터가 없습니다.",
      };
    }

    if (data.status !== "000") {
      return {
        value: null,
        status: data.status === "010" || data.status === "011" ? "api_required" : "error",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: data.message || `OpenDART error code ${data.status}`,
      };
    }

    return {
      value: data.list,
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
      updatedAt: null,
      message: err?.message || String(err),
    };
  }
}
