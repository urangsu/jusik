import { ProposedFactor } from "./proposed-factor";

export type StrategySpecDraft = {
  id: string;
  sourceDocumentId: string;
  extractedHypothesis: string;
  proposedFactors: ProposedFactor[];
  proposedUniverse: string | null;
  proposedRebalance: string | null;
  proposedRiskControls: string[];
  missingDesignQuestions: string[];
  status: "draft" | "needs_human_review" | "human_reviewed" | "backtest_queued";
};

/**
 * Validates and updates ProposedFactor's needsHumanReview state.
 * Rule: If weightSuggested is null, needsHumanReview becomes true.
 */
export function validateStrategySpecDraft(draft: StrategySpecDraft): StrategySpecDraft {
  const updatedFactors = draft.proposedFactors.map((factor) => {
    const needsReview = factor.weightSuggested === null ? true : factor.needsHumanReview;
    return {
      ...factor,
      needsHumanReview: needsReview,
    };
  });

  const hasAnyNeedsReview = updatedFactors.some((f) => f.needsHumanReview);
  let status = draft.status;
  if (hasAnyNeedsReview && status === "draft") {
    status = "needs_human_review";
  }

  return {
    ...draft,
    proposedFactors: updatedFactors,
    status,
  };
}
