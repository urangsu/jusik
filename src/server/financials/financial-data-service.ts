import { DataEnvelope, MarketRegion } from "@/domain/common/data-status";
import { getCorpCodeByStockCode } from "../opendart/corp-code-store";
import { fetchOpenDartFinancialStatements } from "../opendart/financial-statement-client";
import { normalizeOpenDartFinancialStatements, NormalizedFinancialStatement } from "../opendart/financial-statement-normalizer";
import { marketDataService } from "../services/market-data-service";

export type FinancialRatios = {
  assetId: string;
  symbol: string;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  updatedAt: string;
};

export class FinancialDataService {
  async getFinancialStatements(params: {
    symbol: string;
    region: MarketRegion;
    basis?: "CFS" | "OFS";
    period?: "annual" | "quarter";
    bsnsYear?: string;
  }): Promise<DataEnvelope<NormalizedFinancialStatement>> {
    if (params.region !== "KR") {
      return {
        value: null,
        status: "not_supported",
        source: "SEC EDGAR",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: "SEC EDGAR XBRL company facts normalization is not implemented.",
      };
    }

    const corpRecord = await getCorpCodeByStockCode(params.symbol);
    if (!corpRecord) {
      return {
        value: null,
        status: "not_found",
        source: "OpenDART",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
        message: `DART corp code not found for stock code '${params.symbol}'.`,
      };
    }

    const currentYear = new Date().getFullYear();
    const bsnsYear = params.bsnsYear || String(currentYear - 1);
    const reprtCode = params.period === "quarter" ? "11014" : "11011";
    const basis = params.basis || "CFS";

    const fetchRes = await fetchOpenDartFinancialStatements({
      corpCode: corpRecord.corpCode,
      bsnsYear,
      reprtCode,
      fsDiv: basis,
    });

    if (fetchRes.status !== "eod" || !fetchRes.value || fetchRes.value.length === 0) {
      return {
        value: null,
        status: fetchRes.status,
        source: "OpenDART",
        sourceTier: "official",
        warnings: fetchRes.warnings || [],
        updatedAt: fetchRes.updatedAt,
        message: fetchRes.message,
      };
    }

    const normalized = normalizeOpenDartFinancialStatements(
      params.symbol,
      corpRecord.corpCode,
      bsnsYear,
      reprtCode,
      basis,
      fetchRes.value
    );

    const statementDataAsOf = `${bsnsYear}-12-31T00:00:00.000Z`;

    return {
      value: normalized,
      status: "eod",
      source: "OpenDART",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
      dataAsOf: statementDataAsOf,
    };
  }

  async getFinancialRatios(params: {
    symbol: string;
    region: MarketRegion;
  }): Promise<DataEnvelope<FinancialRatios>> {
    const stmtRes = await this.getFinancialStatements({
      symbol: params.symbol,
      region: params.region,
    });

    const quoteRes = await marketDataService.getQuote(params.symbol, params.region);

    if (stmtRes.status !== "eod" || !stmtRes.value || !quoteRes.value) {
      return {
        value: null,
        status: "insufficient_data",
        source: "financial-data-service",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
        message: "Required quote or financial statement operands are missing.",
      };
    }

    const stmt = stmtRes.value;
    const quote = quoteRes.value;

    let roe: number | null = null;
    if (stmt.netIncome !== null && stmt.totalEquity !== null && stmt.totalEquity > 0) {
      roe = (stmt.netIncome / stmt.totalEquity) * 100;
    }

    return {
      value: {
        assetId: `KR:${params.symbol}`,
        symbol: params.symbol,
        per: null, // Market cap / shares or eps required for PER; keep null if shares count unmapped
        pbr: null,
        roe: roe !== null ? parseFloat(roe.toFixed(2)) : null,
        updatedAt: new Date().toISOString(),
      },
      status: "eod",
      source: "financial-data-service",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

export const financialDataService = new FinancialDataService();
