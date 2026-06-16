import { UniverseId } from "./universe";

export type UniverseMembership = {
  universeId: UniverseId;
  assetId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  source: string;
  dataVersionId: string;
};
