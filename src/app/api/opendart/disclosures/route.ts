import { NextRequest } from "next/server";
import { createSafeResponse } from "../../../../server/security/safe-api-response";
import { searchOpenDartDisclosures } from "../../../../server/opendart/disclosure-search-client";
import { getCorpCodeByStockCode } from "../../../../server/opendart/corp-code-store";
import { OpenDartDisclosureType } from "../../../../domain/opendart/opendart-disclosure-type";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stockCode = searchParams.get("stockCode");
  let corpCode = searchParams.get("corpCode") || undefined;
  const beginDate = searchParams.get("beginDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const type = (searchParams.get("type") as OpenDartDisclosureType) || undefined;
  const finalOnly = searchParams.get("finalOnly") === "true";
  const pageNo = searchParams.get("pageNo") ? parseInt(searchParams.get("pageNo")!, 10) : undefined;
  const pageCount = searchParams.get("pageCount") ? parseInt(searchParams.get("pageCount")!, 10) : undefined;

  try {
    if (stockCode && !corpCode) {
      const record = await getCorpCodeByStockCode(stockCode);
      if (record) {
        corpCode = record.corpCode;
      } else {
        return createSafeResponse({
          value: null,
          status: "not_found",
          source: "OpenDART Disclosures API",
          sourceTier: "official",
          warnings: [],
          updatedAt: null,
          message: `StockCode [${stockCode}]에 매핑된 고유번호(corp_code)가 없습니다. 고유번호 마스터를 먼저 업로드해 주세요.`,
        }, 404);
      }
    }

    const result = await searchOpenDartDisclosures({
      corpCode,
      beginDate,
      endDate,
      disclosureType: type,
      finalReportOnly: finalOnly,
      pageNo,
      pageCount,
    });

    return createSafeResponse(result);
  } catch (err: any) {
    return createSafeResponse({
      value: null,
      status: "error",
      source: "OpenDART Disclosures API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    }, 500);
  }
}

export const dynamic = "force-dynamic";
