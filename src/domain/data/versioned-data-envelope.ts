import { DataStatus } from "@/domain/common/data-status";
import { SourceUsagePolicy, SourceWarning } from "@/domain/source/provider-tier";

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
  sourceTier: SourceUsagePolicy;
  warnings: SourceWarning[];
  value: T;
};
