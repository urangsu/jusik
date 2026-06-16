export type ResearchGate = {
  factorId: string;
  passedIcTest: boolean;
  passedTurnoverTest: boolean;
  passedCostTest: boolean;
  passedOutOfSampleTest: boolean;
  passedStabilityTest: boolean;
  productionEligible: boolean;
  reason: string[];
};
