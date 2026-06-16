import { describe, expect, it } from "vitest";
import { createResearchOnlyFactorDefinition } from "./factor-definition";

describe("createResearchOnlyFactorDefinition", () => {
  it("forces productionEligible to false by default", () => {
    const definition = createResearchOnlyFactorDefinition({
      definitionId: "value_v1_book_to_market",
      factorId: "value",
      displayName: "Value",
      components: [
        {
          atomicSignalId: "book_to_market",
          rawWeight: 1,
          halfLifeDays: 365,
          direction: 1,
        },
      ],
      sectorNeutralize: true,
      capNeutralize: false,
      countryNeutralize: true,
      orthogonalizeAgainst: [],
      rebalanceFrequency: "monthly",
      engineVersion: "0.2.0",
      configHash: "hash",
    });

    expect(definition.productionEligible).toBe(false);
  });
});
