export type DividendHistoryItem = {
  exDividendDate: string; // Ex-dividend date
  paymentDate: string | null; // Payment date
  amount: number;
  currency: "KRW" | "USD";
};

export type Dividend = {
  assetId: string;
  symbol: string;
  dividendYieldPercent: number | null; // Dividend yield %
  dividendPayoutRatioPercent: number | null; // Payout ratio %
  history: DividendHistoryItem[];
};
