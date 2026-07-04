import type { DataEnvelope } from "@/domain/common/data-status";

export type MarketBackfillUniverse = "KOSPI_SAMPLE" | "SP500_SAMPLE";
export type MarketBackfillCapability = "quote" | "ohlcv";
export type MarketBackfillStatus = "completed" | "partial" | "failed";

export type MarketBackfillAsset = {
  assetId: string;
  symbol: string;
  market: "KR" | "US";
};

export type MarketBackfillRequest = {
  universe: MarketBackfillUniverse;
  capability: MarketBackfillCapability;
  range?: "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "10Y";
  interval?: "1D" | "1W" | "1M";
};

export type MarketBackfillAssetResult = {
  assetId: string;
  symbol: string;
  market: "KR" | "US";
  capability: MarketBackfillCapability;
  envelopeStatus: DataEnvelope<unknown>["status"];
  dataAvailable: boolean;
  storedPath: string | null;
  warnings: string[];
  message: string | null;
};

export type MarketBackfillReport = {
  id: string;
  request: Required<MarketBackfillRequest>;
  status: MarketBackfillStatus;
  totalCount: number;
  dataAvailableCount: number;
  apiRequiredCount: number;
  errorCount: number;
  results: MarketBackfillAssetResult[];
  generatedDataRoot: string;
  createdAt: string;
  engineVersion: string;
};
