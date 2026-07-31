import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { Filing } from "@/domain/filing/filing";
import { providerRegistry } from "./provider-registry";
import { providerBudgetManager } from "./provider-budget-manager";
import { FilingProvider, FinancialProvider } from "../adapters/types";
import { getCorpCodeByStockCode } from "../opendart/corp-code-store";
import { searchOpenDartDisclosures } from "../opendart/disclosure-search-client";
import { fetchOpenDartFinancialStatements } from "../opendart/financial-statement-client";
import { normalizeOpenDartFinancialStatements } from "../opendart/financial-statement-normalizer";

export class OpendartProvider implements FilingProvider, FinancialProvider {
  private providerId = "opendart";

  async getFilings(params: { symbol: string; region: MarketRegion }): Promise<DataEnvelope<Filing[]>> {
    if (!providerRegistry.isEnabled(this.providerId)) {
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

    if (!providerBudgetManager.consume(this.providerId)) {
      return {
        value: null,
        status: "rate_limited",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
      };
    }

    try {
      const corpRecord = await getCorpCodeByStockCode(params.symbol);
      if (!corpRecord) {
        return {
          value: null,
          status: "not_found",
          source: "OpenDART",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
          message: `DART corp code not found for stock code ${params.symbol}`,
        };
      }

      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      const beginDate = oneYearAgo.toISOString().split("T")[0].replace(/-/g, "");
      const endDate = today.toISOString().split("T")[0].replace(/-/g, "");

      const searchRes = await searchOpenDartDisclosures({
        corpCode: corpRecord.corpCode,
        beginDate,
        endDate,
        pageCount: 100,
      });

      if (searchRes.status === "rate_limited") {
        return {
          value: null,
          status: "rate_limited",
          source: "OpenDART",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
        };
      }

      if (searchRes.status === "not_found" || !searchRes.value) {
        return {
          value: [],
          status: "eod",
          source: "OpenDART",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
        };
      }

      if (searchRes.status === "error") {
        return {
          value: null,
          status: "error",
          source: "OpenDART",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
          message: searchRes.message || "OpenDART search error",
        };
      }

      const list = searchRes.value.list || [];
      const filings: Filing[] = list.map((item) => ({
        id: `opendart_${item.rcept_no}`,
        assetId: `KR:${item.stock_code || params.symbol}`,
        symbol: item.stock_code || params.symbol,
        region: "KR",
        title: item.report_nm,
        publishedAt: new Date(
          parseInt(item.rcept_dt.substring(0, 4), 10),
          parseInt(item.rcept_dt.substring(4, 6), 10) - 1,
          parseInt(item.rcept_dt.substring(6, 8), 10)
        ).toISOString(),
        url: `https://opendart.fss.or.kr/api/document.xml?rcpt_no=${item.rcept_no}`,
        formType: item.report_nm,
        uniqueIdentifier: item.rcept_no,
      }));

      return {
        value: filings,
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
        message: err.message || String(err),
      };
    }
  }

  async getFinancialStatements(params: {
    symbol: string;
    region: MarketRegion;
    basis: "CFS" | "OFS";
    period: "annual" | "quarter";
  }): Promise<DataEnvelope<unknown>> {
    if (!providerRegistry.isEnabled(this.providerId)) {
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

    try {
      const corpRecord = await getCorpCodeByStockCode(params.symbol);
      if (!corpRecord) {
        return {
          value: null,
          status: "not_found",
          source: "OpenDART",
          sourceTier: "official",
          warnings: [],
          updatedAt: new Date().toISOString(),
          message: `DART corp code not found for stock code ${params.symbol}`,
        };
      }

      const currentYear = new Date().getFullYear();
      const bsnsYear = String(currentYear - 1);
      const reprtCode = params.period === "quarter" ? "11014" : "11011";

      const res = await fetchOpenDartFinancialStatements({
        corpCode: corpRecord.corpCode,
        bsnsYear,
        reprtCode,
        fsDiv: params.basis,
      });

      if (res.status !== "eod" || !res.value) {
        return {
          value: null,
          status: res.status,
          source: "OpenDART",
          sourceTier: "official",
          warnings: res.warnings || [],
          updatedAt: res.updatedAt,
          message: res.message,
        };
      }

      const normalized = normalizeOpenDartFinancialStatements(
        params.symbol,
        corpRecord.corpCode,
        bsnsYear,
        reprtCode,
        params.basis,
        res.value
      );

      return {
        value: normalized,
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
        message: err.message || String(err),
      };
    }
  }
}

export const opendartProvider = new OpendartProvider();
