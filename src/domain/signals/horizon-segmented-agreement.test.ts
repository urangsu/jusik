import { describe, it, expect } from "vitest";
import { calculateHorizonSegmentedAgreement } from "./horizon-segmented-agreement";
import { ViewApplicability } from "./view-applicability";

describe("calculateHorizonSegmentedAgreement", () => {
  it("8. applicable=false인 view는 agreement participatingViews에서 제외된다", () => {
    const views = [
      { viewId: "V1", horizon: "short" as const, label: "watch" as const, score: 70 },
      { viewId: "V2", horizon: "short" as const, label: "risk" as const, score: 20 },
    ];
    const applicability: ViewApplicability[] = [
      { viewId: "V1", assetId: "A", applicable: true, reason: null },
      { viewId: "V2", assetId: "A", applicable: false, reason: "Not applicable to asset" },
    ];

    const result = calculateHorizonSegmentedAgreement("A", "2026-06-17", views, applicability);
    expect(result.byHorizon["short"].participatingViews).toContain("V1");
    expect(result.byHorizon["short"].participatingViews).not.toContain("V2");
    expect(result.byHorizon["short"].weightedScore).toBe(70);
  });

  it("9. 단기/장기 신호가 충돌하면 crossHorizonTension.detected=true가 된다", () => {
    const views = [
      { viewId: "V1", horizon: "short" as const, label: "strong_watch" as const, score: 85 },
      { viewId: "V2", horizon: "long" as const, label: "risk" as const, score: 10 },
    ];
    const applicability: ViewApplicability[] = [];

    const result = calculateHorizonSegmentedAgreement("A", "2026-06-17", views, applicability);
    expect(result.crossHorizonTension.detected).toBe(true);
    expect(result.crossHorizonTension.description).toContain("Cross-horizon tension detected");
  });

  it("should not detect tension if short and long are in agreement", () => {
    const views = [
      { viewId: "V1", horizon: "short" as const, label: "watch" as const, score: 70 },
      { viewId: "V2", horizon: "long" as const, label: "watch" as const, score: 75 },
    ];
    const applicability: ViewApplicability[] = [];

    const result = calculateHorizonSegmentedAgreement("A", "2026-06-17", views, applicability);
    expect(result.crossHorizonTension.detected).toBe(false);
  });
});
