export type SpecificRiskRecord = {
  assetId: string;
  date: string;
  specificVariance: number | null;
  specificVolatility: number | null;
  method: "residual_from_factor_model" | "rolling_residual_vol" | "fallback_realized_vol";
  dataQualityScore: number;
  engineVersion: string;
};
