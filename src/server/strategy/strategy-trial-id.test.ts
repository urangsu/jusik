import { describe, it, expect } from "vitest";
import { createStrategyTrialId } from "./strategy-trial-id";

describe("createStrategyTrialId", () => {
  it("generates a safe ID containing the components and yyyymmddhhmmss and a short hash", () => {
    const id = createStrategyTrialId({
      strategyId: "momentum_v1_long_only",
      universeId: "KOSPI_SAMPLE",
      variantId: "baseline",
      createdAt: "2026-06-19T12:15:30.000Z",
    });

    expect(id).toContain("trial_");
    expect(id).toContain("momentum_v1_long_only");
    expect(id).toContain("KOSPI_SAMPLE");
    expect(id).toContain("baseline");
    expect(id).not.toContain(" ");
    expect(id).not.toContain("/");
    expect(id).not.toContain(":");
  });
});
