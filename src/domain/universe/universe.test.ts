import { describe, expect, it } from "vitest";
import { createSeedDemoUniverse, isProductionEligibleUniverse } from "./universe";

describe("universe policy", () => {
  it("marks SEED_DEMO as non-production", () => {
    const universe = createSeedDemoUniverse("2026-06-16T00:00:00.000Z");

    expect(universe.universeId).toBe("SEED_DEMO");
    expect(universe.productionEligible).toBe(false);
    expect(isProductionEligibleUniverse(universe)).toBe(false);
  });

  it("does not treat mixed universe as production eligible", () => {
    const productionEligible = true;

    expect(
      isProductionEligibleUniverse({
        universeId: "USER_WATCHLIST",
        market: "MIXED",
        kind: "user_defined",
        displayName: "Watchlist",
        description: "Mixed user list",
        productionEligible,
        createdAt: "2026-06-16T00:00:00.000Z",
        updatedAt: "2026-06-16T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});
