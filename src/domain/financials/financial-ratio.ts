export type FinancialRatio = {
  assetId: string;
  symbol: string;
  fiscalYear: number;
  fiscalPeriod: "annual" | "quarter";
  per: number | null;
  pbr: number | null;
  psr: number | null;
  evEbitda: number | null;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
};
