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
});
