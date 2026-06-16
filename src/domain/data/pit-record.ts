import { DataSourceKind } from "./data-source";

export type PitRecordStatus =
  | "valid"
  | "api_required"
  | "insufficient_data"
  | "stale"
  | "revised"
  | "superseded"
  | "error";

export type PitRecord<T> = {
  pitRecordId: string;
  assetId?: string;
  market: "KR" | "US" | "GLOBAL";
  sourceKind: DataSourceKind;
  value: T | null;
  asOfDate: string;
  effectiveAt: string;
  ingestedAt: string;
  dataVersionId: string;
  revisionId?: string;
  status: PitRecordStatus;
  source: string;
  sourceUrl?: string;
  hash: string;
};

export function createPitRecord<T>(input: PitRecord<T>): PitRecord<T> {
  if (!input.dataVersionId) {
    throw new Error("PitRecord requires dataVersionId.");
  }
  return { ...input };
}
