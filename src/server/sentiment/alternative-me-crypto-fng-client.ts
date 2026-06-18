import { SentimentReferenceSnapshot } from "@/domain/sentiment/sentiment-reference-snapshot";
import { getFearGreedLabel } from "./cnn-fear-greed-reference-client";

export async function fetchCryptoFearGreed(): Promise<SentimentReferenceSnapshot> {
  const enabled = process.env.CRYPTO_FEAR_GREED_ENABLED === "true";
  const baseUrl = process.env.ALTERNATIVE_ME_FNG_BASE_URL || "https://api.alternative.me/fng/";

  let value = 50; // default/fallback neutral value
  let label: SentimentReferenceSnapshot["label"] = "neutral";
  const warnings: SentimentReferenceSnapshot["warnings"] = ["unofficial"];

  if (enabled) {
    try {
      const res = await fetch(`${baseUrl}?limit=1`);
      if (res.ok) {
        const data = await res.json();
        const score = parseInt(data.data?.[0]?.value, 10);
        if (!isNaN(score)) {
          value = score;
          label = getFearGreedLabel(value);
        }
      }
    } catch (err) {
      warnings.push("personal_use_only");
    }
  }

  return {
    id: `crypto-fng-${new Date().toISOString().slice(0, 10)}`,
    market: "crypto",
    provider: "alternative_me_crypto_fear_greed",
    value,
    label,
    usedForCoreSignal: false,
    usedForRegimeGate: false,
    usedForOrderDecision: false,
    source: "Alternative.me Crypto Fear & Greed",
    sourceTier: "personal_fallback",
    warnings,
    updatedAt: new Date().toISOString(),
  };
}
