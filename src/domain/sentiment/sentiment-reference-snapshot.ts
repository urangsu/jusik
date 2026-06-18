import { SourceWarning } from "@/domain/source/provider-tier";

export type SentimentReferenceSnapshot = {
  id: string;

  market:
    | "us_stock"
    | "crypto";

  provider:
    | "cnn_fear_greed_reference"
    | "alternative_me_crypto_fear_greed";

  value: number | null;

  label:
    | "extreme_fear"
    | "fear"
    | "neutral"
    | "greed"
    | "extreme_greed"
    | "not_available";

  usedForCoreSignal: false;
  usedForRegimeGate: false;
  usedForOrderDecision: false;

  source: string;

  sourceTier:
    | "free_limited"
    | "personal_fallback";

  warnings: SourceWarning[];

  updatedAt: string | null;
};
