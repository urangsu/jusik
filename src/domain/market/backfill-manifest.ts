export type MarketBackfillManifest = {
  manifestId: string;
  backfillReportId: string;
  universe: string;
  capability: "quote" | "ohlcv";
  generatedDataRoot: string;
  generatedPaths: string[];
  productionStore: false;
  createdAt: string;
};
