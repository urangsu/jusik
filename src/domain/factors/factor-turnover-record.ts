import { FactorId } from "./factor-id";

export type FactorTurnoverRecord = {
  factorId: FactorId;
  date: string;
  quantile: 1 | 2 | 3 | 4 | 5;
  turnover1d: number | null;
  turnover5d: number | null;
  turnover20d: number | null;
  rankAutocorrelation: number | null;
};
