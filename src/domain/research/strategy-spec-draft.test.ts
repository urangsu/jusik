import { describe, it, expect } from "vitest";
import { validateStrategySpecDraft, StrategySpecDraft } from "./strategy-spec-draft";

describe("validateStrategySpecDraft", () => {
  it("10. Research Intake에서 weightSuggested=null이면 needsHumanReview=true가 된다", () => {
    const draft: StrategySpecDraft = {
      id: "D1",
      sourceDocumentId: "DOC1",
      extractedHypothesis: "Test hypothesis",
      proposedUniverse: "KOSPI",
      proposedRebalance: "monthly",
      proposedRiskControls: [],
      missingDesignQuestions: [],
      status: "draft",
      proposedFactors: [
        {
          factorId: "F1",
          direction: "higher_is_better",
          extractionEvidence: "Factor 1 is better higher",
          weightSuggested: null,
          thresholdSuggested: 0.5,
          needsHumanReview: false,
        },
        {
          factorId: "F2",
          direction: "lower_is_better",
          extractionEvidence: "Factor 2 weight is clear",
          weightSuggested: 0.3,
          thresholdSuggested: 0.2,
          needsHumanReview: false,
        },
      ],
    };

    const validated = validateStrategySpecDraft(draft);
    expect(validated.proposedFactors[0].needsHumanReview).toBe(true);
    expect(validated.proposedFactors[1].needsHumanReview).toBe(false);
    expect(validated.status).toBe("needs_human_review");
  });
});
