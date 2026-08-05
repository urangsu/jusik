import { OpenDartSingleAcntAllItem } from "./financial-statement-client";

export type NormalizedFinancialStatement = {
  assetId: string;
  symbol: string;
  corpCode: string;
  bsnsYear: string;
  reprtCode: string;
  receiptNo: string;
  currency: string;
  basis: "CFS" | "OFS";
  revenue: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  updatedAt: string;
};

const CONCEPT_MAP: Record<string, keyof NormalizedFinancialStatement> = {
  // Revenue / Sales
  "ifrs-full_Revenue": "revenue",
  "dart_Revenue": "revenue",
  "ifrs_Revenue": "revenue",
  
  // Operating Profit / Loss
  "dart_OperatingProfitLoss": "operatingIncome",
  "ifrs-full_OperatingProfitLoss": "operatingIncome",
  "ifrs_OperatingProfitLoss": "operatingIncome",

  // Net Profit / Loss
  "ifrs-full_ProfitLoss": "netIncome",
  "dart_ProfitLoss": "netIncome",
  "ifrs_ProfitLoss": "netIncome",

  // Assets
  "ifrs-full_Assets": "totalAssets",
  "dart_Assets": "totalAssets",

  // Liabilities
  "ifrs-full_Liabilities": "totalLiabilities",
  "dart_Liabilities": "totalLiabilities",

  // Equity
  "ifrs-full_Equity": "totalEquity",
  "dart_Equity": "totalEquity",
};

export function normalizeOpenDartFinancialStatements(
  symbol: string,
  corpCode: string,
  bsnsYear: string,
  reprtCode: string,
  basis: "CFS" | "OFS",
  rawItems: OpenDartSingleAcntAllItem[]
): NormalizedFinancialStatement {
  let revenue: number | null = null;
  let operatingIncome: number | null = null;
  let netIncome: number | null = null;
  let totalAssets: number | null = null;
  let totalLiabilities: number | null = null;
  let totalEquity: number | null = null;
  let receiptNo = "";

  for (const item of rawItems) {
    if (item.rcept_no) receiptNo = item.rcept_no;
    const targetKey = CONCEPT_MAP[item.account_id];

    if (targetKey && item.thstrm_amount) {
      const cleanAmt = item.thstrm_amount.replace(/,/g, "").trim();
      const num = parseFloat(cleanAmt);
      if (!isNaN(num)) {
        if (targetKey === "revenue" && revenue === null) revenue = num;
        if (targetKey === "operatingIncome" && operatingIncome === null) operatingIncome = num;
        if (targetKey === "netIncome" && netIncome === null) netIncome = num;
        if (targetKey === "totalAssets" && totalAssets === null) totalAssets = num;
        if (targetKey === "totalLiabilities" && totalLiabilities === null) totalLiabilities = num;
        if (targetKey === "totalEquity" && totalEquity === null) totalEquity = num;
      }
    }
  }

  return {
    assetId: `KR:${symbol}`,
    symbol,
    corpCode,
    bsnsYear,
    reprtCode,
    receiptNo,
    currency: "KRW",
    basis,
    revenue,
    operatingIncome,
    netIncome,
    totalAssets,
    totalLiabilities,
    totalEquity,
    updatedAt: new Date().toISOString(),
  };
}
