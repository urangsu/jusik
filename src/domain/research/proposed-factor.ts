export type ProposedFactor = {
  factorId: string;
  direction: "higher_is_better" | "lower_is_better" | null;

  extractionEvidence: string;
  weightSuggested: number | null;
  thresholdSuggested: number | null;
  needsHumanReview: boolean;
};
