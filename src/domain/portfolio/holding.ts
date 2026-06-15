export type Holding = {
  assetId: string;
  symbol: string;
  name: string;
  shares: number;
  averageCost: number;
  currency: "KRW" | "USD";
  updatedAt: string;
};

export type Portfolio = {
  id: string;
  holdings: Holding[];
  cashBalanceKrw: number;
  cashBalanceUsd: number;
};
