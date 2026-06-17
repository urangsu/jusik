import { NextRequest } from "next/server";
import { createSafeResponse } from "../../../../server/security/safe-api-response";
import { getCorpCodeByStockCode, searchCorpCodes } from "../../../../server/opendart/corp-code-store";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stockCode = searchParams.get("stockCode");
  const query = searchParams.get("query");

  try {
    if (stockCode) {
      const record = await getCorpCodeByStockCode(stockCode);
      return createSafeResponse({
        value: record,
        status: record ? "cached" : "not_found",
        source: "Corp Code Store",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
      });
    }

    if (query) {
      const list = await searchCorpCodes(query);
      return createSafeResponse({
        value: list,
        status: "cached",
        source: "Corp Code Store",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
      });
    }

    return createSafeResponse({
      value: null,
      status: "insufficient_data",
      source: "Corp Code Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: "쿼리 파라미터 'stockCode' 또는 'query'를 제공해야 합니다.",
    }, 400);
  } catch (err: any) {
    return createSafeResponse({
      value: null,
      status: "error",
      source: "Corp Code Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    }, 500);
  }
}

export const dynamic = "force-dynamic";
