import { DataVersion } from "@/domain/data/data-version";

export type DataVersionCreateInput = {
  vendor: string;
  source: string;
  asOfDate: string;
  effectiveAt: string;
  ingestedAt: string;
  revisionId?: string;
  hash: string;
};

export interface DataVersionStore {
  create(input: DataVersionCreateInput): Promise<DataVersion>;
  getById(dataVersionId: string): Promise<DataVersion | null>;
  findLatest(params: {
    vendor: string;
    source: string;
    asOfDate: string;
  }): Promise<DataVersion | null>;
}
