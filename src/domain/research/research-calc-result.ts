export type ResearchCalcStatus =
  | "ok"
  | "insufficient_data"
  | "invalid_input"
  | "not_supported"
  | "error";

export type ResearchCalcResult<T> = {
  value: T | null;
  status: ResearchCalcStatus;
  warnings: string[];
  sampleSize?: number;
};

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
