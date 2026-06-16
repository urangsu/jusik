export type RiskDecomposition = {
  portfolioId: string;
  date: string;
  totalVariance: number | null;
  factorVariance: number | null;
  specificVariance: number | null;
  totalVolatility: number | null;
  factorVolatility: number | null;
  specificVolatility: number | null;
  cashWeight: number;
  factorRiskContributions: Array<{
    factorId: string;
    varianceContribution: number;
    contributionPct: number;
  }>;
  specificRiskContribution: number | null;
  warnings: string[];
  engineVersion: string;
  dataVersionId: string;
};
