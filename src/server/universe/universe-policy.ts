import { Universe } from "@/domain/universe/universe";

export function canUseUniverseForProductionSignal(universe: Universe): boolean {
  return universe.productionEligible && universe.kind !== "seed_demo" && universe.market !== "MIXED";
}
