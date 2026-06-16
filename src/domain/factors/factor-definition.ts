import { FactorId } from "./factor-id";

export type FactorComponent = {
  atomicSignalId: string;
  rawWeight: number;
  halfLifeDays: number;
  direction: 1 | -1;
};

export type FactorDefinition = {
  definitionId: string;
  factorId: FactorId;
  displayName: string;
  components: FactorComponent[];
  sectorNeutralize: boolean;
  capNeutralize: boolean;
  countryNeutralize: boolean;
  orthogonalizeAgainst: FactorId[];
  rebalanceFrequency: "daily" | "weekly" | "monthly" | "quarterly" | "annual";
  productionEligible: boolean;
  engineVersion: string;
  configHash: string;
};

export function createResearchOnlyFactorDefinition(
  input: Omit<FactorDefinition, "productionEligible">,
): FactorDefinition {
  return {
    ...input,
    productionEligible: false,
  };
}
