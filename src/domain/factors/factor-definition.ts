import { SignalHorizon } from "./factor-horizon";

export type FactorDefinition = {
  factorId: string;
  version: string;
  displayName: {
    ko: string;
    en: string;
  };
  formulaHash: string;
  inputRequirements: string[];
  horizon: SignalHorizon;
  createdAt: string;
};
