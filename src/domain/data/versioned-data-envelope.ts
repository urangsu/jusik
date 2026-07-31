import { DataStatus, SourceTier, SourceWarning } from "@/domain/common/data-status";

export type VersionedDataEnvelope<T = unknown> = {
  dataVersionId: string;
  assetId: string;
  providerId: string;
  capability: "quote" | "ohlcv" | "financials" | "filings";
  effectiveAt: string; // Source timestamp
  ingestedAt: string; // Retrieval / ingestion timestamp
  contentHash: string;
  schemaVersion: string;
  supersededRevisionId: string | null;
  status: DataStatus;
  sourceTier: SourceTier;
  warnings: SourceWarning[];
  value: T;
};
