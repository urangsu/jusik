import { MarketRegion } from "../common/data-status";

export type FinancialStatementItem = {
  conceptId: string; // e.g., "Revenues", "NetIncome"
  nameKo?: string;
  nameEn?: string;
  value: number | null;
};

export type FinancialStatement = {
  assetId: string;
  symbol: string;
  region: MarketRegion;
  fiscalYear: number;
  fiscalPeriod: "annual" | "Q1" | "Q2" | "Q3" | "Q4" | "quarter";
  basis: "CFS" | "OFS"; // CFS (Consolidated) / OFS (Separate)
  currency: "KRW" | "USD";
  items: {
    incomeStatement: FinancialStatementItem[];
    balanceSheet: FinancialStatementItem[];
    cashFlow: FinancialStatementItem[];
  };
};
