import { DataSourceKind } from "@/domain/data/data-source";
import { PitRecord } from "@/domain/data/pit-record";

export interface PitStore {
  put<T>(record: PitRecord<T>): Promise<void>;
  getById<T>(pitRecordId: string): Promise<PitRecord<T> | null>;
  getAsOf<T>(params: {
    assetId?: string;
    sourceKind: DataSourceKind;
    asOfDate: string;
    knownAt: string;
  }): Promise<PitRecord<T> | null>;
}
