import { PitRecord } from "@/domain/data/pit-record";
import { PitStore } from "./pit-store";

export class InMemoryPitStore implements PitStore {
  private records = new Map<string, PitRecord<unknown>>();

  async put<T>(record: PitRecord<T>): Promise<void> {
    if (this.records.has(record.pitRecordId)) {
      throw new Error("InMemoryPitStore does not overwrite existing PIT records.");
    }
    this.records.set(record.pitRecordId, record as PitRecord<unknown>);
  }

  async getById<T>(pitRecordId: string): Promise<PitRecord<T> | null> {
    return (this.records.get(pitRecordId) as PitRecord<T> | undefined) ?? null;
  }

  async getAsOf<T>(params: Parameters<PitStore["getAsOf"]>[0]): Promise<PitRecord<T> | null> {
    const matches = Array.from(this.records.values()).filter((record) => {
      const assetMatches = params.assetId === undefined || record.assetId === params.assetId;
      return (
        assetMatches &&
        record.sourceKind === params.sourceKind &&
        record.asOfDate <= params.asOfDate &&
        record.ingestedAt <= params.knownAt
      );
    });
    matches.sort((a, b) => {
      const ingestedCompare = b.ingestedAt.localeCompare(a.ingestedAt);
      if (ingestedCompare !== 0) return ingestedCompare;
      return b.effectiveAt.localeCompare(a.effectiveAt);
    });
    return (matches[0] as PitRecord<T> | undefined) ?? null;
  }
}
