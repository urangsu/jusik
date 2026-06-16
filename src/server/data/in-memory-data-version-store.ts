import { DataVersion } from "@/domain/data/data-version";
import { DataVersionCreateInput, DataVersionStore } from "./version-store";

export class InMemoryDataVersionStore implements DataVersionStore {
  private versions = new Map<string, DataVersion>();
  private sequence = 0;

  async create(input: DataVersionCreateInput): Promise<DataVersion> {
    this.sequence += 1;
    const version: DataVersion = {
      dataVersionId: `dv_${this.sequence}`,
      ...input,
    };
    this.versions.set(version.dataVersionId, version);
    return version;
  }

  async getById(dataVersionId: string): Promise<DataVersion | null> {
    return this.versions.get(dataVersionId) ?? null;
  }

  async findLatest(params: {
    vendor: string;
    source: string;
    asOfDate: string;
  }): Promise<DataVersion | null> {
    const matches = Array.from(this.versions.values()).filter(
      (version) =>
        version.vendor === params.vendor &&
        version.source === params.source &&
        version.asOfDate === params.asOfDate,
    );
    matches.sort((a, b) => b.ingestedAt.localeCompare(a.ingestedAt));
    return matches[0] ?? null;
  }
}
