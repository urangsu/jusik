export type DataVersion = {
  dataVersionId: string;
  vendor: string;
  source: string;
  asOfDate: string;
  effectiveAt: string;
  ingestedAt: string;
  revisionId?: string;
  hash: string;
};

export type EngineVersion = {
  engineId: string;
  engineVersion: string;
};
