import { ResearchCalcResult, isFiniteNumber } from "../research-calc-result";

export type ICIRResult = {
  icir: number;
  meanIc: number;
  sampleStdDev: number;
  sampleSize: number;
};

export function calculateICIR(params: {
  icValues: Array<number | null>;
  window: number;
}): ResearchCalcResult<ICIRResult> {
  const finiteValues = params.icValues.filter(isFiniteNumber).slice(-params.window);

  if (finiteValues.length < params.window) {
    return {
      value: null,
      status: "insufficient_data",
      warnings: ["ICIR requires a full finite IC history window."],
      sampleSize: finiteValues.length,
    };
  }

  const meanIc = finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
  const variance =
    finiteValues.reduce((sum, value) => sum + (value - meanIc) ** 2, 0) / (finiteValues.length - 1);
  const sampleStdDev = Math.sqrt(variance);

  if (!Number.isFinite(sampleStdDev) || sampleStdDev <= Number.EPSILON) {
    return {
      value: null,
      status: "insufficient_data",
      warnings: ["ICIR requires non-zero sample standard deviation."],
      sampleSize: finiteValues.length,
    };
  }

  const icir = meanIc / sampleStdDev;
  if (!Number.isFinite(icir)) {
    return {
      value: null,
      status: "invalid_input",
      warnings: ["ICIR calculation produced a non-finite value."],
      sampleSize: finiteValues.length,
    };
  }

  return {
    value: {
      icir,
      meanIc,
      sampleStdDev,
      sampleSize: finiteValues.length,
    },
    status: "ok",
    warnings: [],
    sampleSize: finiteValues.length,
  };
}
