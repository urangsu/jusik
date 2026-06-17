import { PriceBar } from "./price-bar";

export type AdjustedPriceBar = PriceBar & {
  adjustedOpen: number;
  adjustedHigh: number;
  adjustedLow: number;
  adjustedClose: number;
  adjustmentFactor: number;
};
