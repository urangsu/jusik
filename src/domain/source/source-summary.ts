import { SourceUsagePolicy, SourceWarning } from "./provider-tier";

export type SourceSummary = {
  providerId: string;
  displayName: string;
  tier: SourceUsagePolicy;
  status: string;
  used: number;
  limit: number | null;
  warnings: SourceWarning[];
  enabled: boolean;
};
