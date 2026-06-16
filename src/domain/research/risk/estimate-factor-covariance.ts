import { FactorCovarianceMatrix } from "@/domain/risk/factor-covariance-matrix";
import { ResearchCalcResult, isFiniteNumber } from "../research-calc-result";

type EstimateFactorCovarianceParams = {
  date: string;
  market: "KR" | "US" | "GLOBAL";
  universe: string;
  factorIds: string[];
  observations: Array<{
    date: string;
    returns: Record<string, number | null>;
  }>;
  lookbackDays: 60 | 120 | 252;
  annualized: boolean;
  configHash?: string;
};

function covariance(xs: number[], ys: number[]): number {
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  return xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0) / (xs.length - 1);
}

export function estimateFactorCovariance(
  params: EstimateFactorCovarianceParams,
): ResearchCalcResult<FactorCovarianceMatrix> {
  if (params.factorIds.length === 0) {
    return {
      value: null,
      status: "invalid_input",
      warnings: ["At least one factorId is required for factor covariance."],
      sampleSize: 0,
    };
  }

  const minimumObservations = Math.max(30, params.factorIds.length * 3);
  const usable = params.observations.filter((observation) =>
    params.factorIds.every((factorId) => isFiniteNumber(observation.returns[factorId])),
  );

  if (usable.length < minimumObservations) {
    return {
      value: null,
      status: "insufficient_data",
      warnings: [`Factor covariance requires at least ${minimumObservations} complete observations.`],
      sampleSize: usable.length,
    };
  }

  const scale = params.annualized ? 252 : 1;
  const covarianceMatrix = params.factorIds.map((factorA) =>
    params.factorIds.map((factorB) => {
      const xs = usable.map((observation) => observation.returns[factorA] as number);
      const ys = usable.map((observation) => observation.returns[factorB] as number);
      return covariance(xs, ys) * scale;
    }),
  );

  const hasInvalidValue = covarianceMatrix.some((row, rowIndex) =>
    row.length !== params.factorIds.length ||
    row.some((value, columnIndex) => !Number.isFinite(value) || (rowIndex === columnIndex && value < 0)),
  );

  if (hasInvalidValue) {
    return {
      value: null,
      status: "invalid_input",
      warnings: ["Factor covariance matrix contains invalid or negative diagonal values."],
      sampleSize: usable.length,
    };
  }

  return {
    value: {
      date: params.date,
      market: params.market,
      universe: params.universe,
      lookbackDays: params.lookbackDays,
      factorIds: params.factorIds as FactorCovarianceMatrix["factorIds"],
      covariance: covarianceMatrix,
      shrinkageMethod: "none",
      annualized: params.annualized,
      engineVersion: "0.2.0",
      configHash: params.configHash ?? "research-config",
      dataVersionId: "research-input",
    },
    status: "ok",
    warnings: [],
    sampleSize: usable.length,
  };
}
