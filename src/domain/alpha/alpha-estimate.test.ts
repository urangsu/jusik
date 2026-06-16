import { describe, expect, it } from "vitest";
import { createSuppressedAlphaEstimate } from "./alpha-estimate";

describe("createSuppressedAlphaEstimate", () => {
  it("allows expected alpha internally but disables display by default", () => {
    const estimate = createSuppressedAlphaEstimate({
      assetId: "KR:005930",
      date: "2026-06-16",
      engineVersion: "0.2.0",
    });

    expect(estimate.expectedAlphaAnnualized).toBeNull();
    expect(estimate.expectedAlphaDisplayAllowed).toBe(false);
  });

  it("keeps P0/P1 factory output suppressed even when the domain type supports expected alpha", () => {
    const estimate = createSuppressedAlphaEstimate({
      assetId: "KR:005930",
      date: "2026-06-16",
      engineVersion: "0.2.0",
    });

    expect(estimate.expectedAlphaDisplayAllowed).toBe(false);
    expect(estimate.reasonForSuppression).toMatch(/disabled in P0\/P1/);
  });
});
