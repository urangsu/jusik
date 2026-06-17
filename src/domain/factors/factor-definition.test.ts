import { describe, it, expect } from "vitest";
import { FactorDefinition } from "./factor-definition";

describe("FactorDefinition Type Schema", () => {
  it("should be constructible with valid definition properties", () => {
    const def: FactorDefinition = {
      factorId: "PER",
      version: "1.0.0",
      displayName: { ko: "주가수익비율", en: "Price-to-Earnings Ratio" },
      formulaHash: "abc123hash",
      inputRequirements: ["price", "eps"],
      horizon: "medium",
      createdAt: "2026-06-17",
    };
    expect(def.factorId).toBe("PER");
    expect(def.horizon).toBe("medium");
  });
});
