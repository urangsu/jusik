import { describe, it, expect } from "vitest";
import { ViewApplicability } from "./view-applicability";

describe("ViewApplicability type", () => {
  it("should support creating correct applicability settings", () => {
    const app: ViewApplicability = {
      viewId: "V1",
      assetId: "A",
      applicable: false,
      reason: "Missing historical data for this asset type",
    };
    expect(app.applicable).toBe(false);
    expect(app.reason).toBe("Missing historical data for this asset type");
  });
});
