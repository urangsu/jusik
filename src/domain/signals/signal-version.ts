import { EngineVersion } from "@/domain/data/engine-version";

export type { EngineVersion } from "@/domain/data/engine-version";

export type SignalVersion = {
  signalVersionId: string;
  engine: EngineVersion;
  dataVersionId: string;
  inputHash?: string;
  calculatedAt: string;
  expiryAt: string | null;
};

export type EngineVersionRef = Pick<EngineVersion, "engineId" | "engineVersion" | "configHash" | "gitCommitSha">;

export type VersionedCalculation = {
  engine: EngineVersionRef;
  dataVersionId: string;
  calculatedAt: string;
};

export function createSignalVersion(input: SignalVersion): SignalVersion {
  return { ...input };
}
