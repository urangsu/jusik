import { RiskDecomposition } from "@/domain/risk/risk-decomposition";
import { ResearchCalcResult, isFiniteNumber } from "../research-calc-result";

type DecomposePortfolioRiskParams = {
  portfolioId: string;
  date: string;
  weights: Array<{ assetId: string; weight: number }>;
  factorExposures: Record<string, Record<string, number | null>>;
  factorCovariance: {
    factorIds: string[];
    covariance: number[][];
  };
  specificVariances: Record<string, number | null>;
  engineVersion: string;
  configHash?: string;
  dataVersionId: string;
  tolerance?: number;
};

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function hasValidCovarianceShape(factorIds: string[], covariance: number[][]): boolean {
  return (
    factorIds.length > 0 &&
    covariance.length === factorIds.length &&
    covariance.every((row) => row.length === factorIds.length && row.every(Number.isFinite))
  );
}

export function decomposePortfolioRisk(
  params: DecomposePortfolioRiskParams,
): ResearchCalcResult<RiskDecomposition> {
  const tolerance = params.tolerance ?? 0.000001;
  const warnings: string[] = [];

  if (!hasValidCovarianceShape(params.factorCovariance.factorIds, params.factorCovariance.covariance)) {
    return {
      value: null,
      status: "invalid_input",
      warnings: ["Factor covariance matrix dimensions must match factorIds."],
      sampleSize: params.weights.length,
    };
  }

  const weightSum = params.weights.reduce((sum, row) => sum + row.weight, 0);

  if (weightSum > 1 + tolerance) {
    warnings.push("assetWeights sum exceeds 1.0 tolerance for long-only P0 portfolio.");
  }

  const cashWeight = Math.max(0, 1 - weightSum);
  const portfolioExposure = params.factorCovariance.factorIds.map((factorId) =>
    params.weights.reduce((sum, row) => {
      const exposure = params.factorExposures[row.assetId]?.[factorId];
      if (!isFiniteNumber(exposure)) {
        warnings.push(`Missing factor exposure for ${row.assetId}.`);
        return sum;
      }
      return sum + row.weight * exposure;
    }, 0),
  );

  const factorCovarianceProduct = params.factorCovariance.covariance.map((row) =>
    dot(row, portfolioExposure),
  );
  const factorVariance = dot(portfolioExposure, factorCovarianceProduct);
  const specificVariance = params.weights.reduce((sum, row) => {
    const variance = params.specificVariances[row.assetId];
    if (!isFiniteNumber(variance)) {
      warnings.push(`Missing specific variance for ${row.assetId}.`);
      return sum;
    }
    if (variance < 0) {
      warnings.push(`Negative specific variance for ${row.assetId}.`);
      return sum;
    }
    return sum + row.weight ** 2 * variance;
  }, 0);
  const totalVariance = factorVariance + specificVariance;

  if (
    !Number.isFinite(factorVariance) ||
    !Number.isFinite(specificVariance) ||
    !Number.isFinite(totalVariance) ||
    factorVariance < 0 ||
    specificVariance < 0 ||
    totalVariance < 0
  ) {
    return {
      value: null,
      status: "invalid_input",
      warnings: [...warnings, "Variance inputs must not produce negative portfolio variance."],
      sampleSize: params.weights.length,
    };
  }

  const factorRiskContributions = params.factorCovariance.factorIds.map((factorId, index) => {
    const varianceContribution = portfolioExposure[index] * factorCovarianceProduct[index];
    return {
      factorId,
      varianceContribution,
      contributionPct: totalVariance === 0 ? 0 : (varianceContribution / totalVariance) * 100,
    };
  });

  const value: RiskDecomposition = {
    portfolioId: params.portfolioId,
    date: params.date,
    totalVariance,
    factorVariance,
    specificVariance,
    totalVolatility: Math.sqrt(totalVariance),
    factorVolatility: Math.sqrt(Math.max(0, factorVariance)),
    specificVolatility: Math.sqrt(Math.max(0, specificVariance)),
    cashWeight,
    factorRiskContributions,
    specificRiskContribution: specificVariance,
    warnings: Array.from(new Set(warnings)),
    engineVersion: params.engineVersion,
    configHash: params.configHash ?? "research-config",
    dataVersionId: params.dataVersionId,
  };

  return {
    value,
    status: "ok",
    warnings: value.warnings,
    sampleSize: params.weights.length,
  };
}
