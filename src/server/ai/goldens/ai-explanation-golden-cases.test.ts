import { describe, it, expect } from "vitest";
import { GOLDEN_EXPLANATION_CASES } from "./ai-explanation-golden-cases";

describe("ai-explanation-golden-cases", () => {
  it("should have exactly 4 golden cases with correct types", () => {
    expect(GOLDEN_EXPLANATION_CASES).toHaveLength(4);

    const safeCase = GOLDEN_EXPLANATION_CASES.find((c) => c.mode === "safe");
    expect(safeCase).toBeDefined();
    expect(safeCase?.expectedBlocked).toBe(false);

    const forbiddenCase = GOLDEN_EXPLANATION_CASES.find((c) => c.mode === "forbidden_wording");
    expect(forbiddenCase).toBeDefined();
    expect(forbiddenCase?.expectedBlocked).toBe(true);
    expect(forbiddenCase?.expectedBlockedTerms).toContain("매수");
  });
});
