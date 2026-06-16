import { describe, it, expect } from "vitest";
import { ProviderBudgetManager } from "./provider-budget-manager";

describe("ProviderBudgetManager", () => {
  it("should enforce limits and deny requests when consumed", () => {
    const manager = new ProviderBudgetManager();
    const budget = manager.getBudget("alpha_vantage_free");
    expect(budget).toBeDefined();

    const limit = budget?.limit || 25;
    for (let i = 0; i < limit; i++) {
      const allowed = manager.consume("alpha_vantage_free");
      expect(allowed).toBe(true);
    }

    // Next consume should be blocked
    const blocked = manager.consume("alpha_vantage_free");
    expect(blocked).toBe(false);
    expect(manager.isAllowed("alpha_vantage_free")).toBe(false);
  });
});
