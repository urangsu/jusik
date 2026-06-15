export type OhlcvBar = {
  time: string; // ISO date format, e.g., "2026-06-15"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type OhlcvSeries = {
  assetId: string;
  symbol: string;
  bars: OhlcvBar[];
};
