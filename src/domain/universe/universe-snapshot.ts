import { UniverseId } from "./universe";

export type UniverseSnapshot = {
  universeId: UniverseId;
  asOfDate: string;
  assetIds: string[];
  dataVersionId: string;
  generatedAt: string;
};
