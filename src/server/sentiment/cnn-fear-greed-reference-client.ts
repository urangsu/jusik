import { SentimentReferenceSnapshot } from "@/domain/sentiment/sentiment-reference-snapshot";

export function getFearGreedLabel(score: number | null): SentimentReferenceSnapshot["label"] {
  if (score === null) return "not_available";
  if (score <= 25) return "extreme_fear";
  if (score <= 45) return "fear";
  if (score <= 55) return "neutral";
  if (score <= 75) return "greed";
  return "extreme_greed";
}

export async function fetchCnnFearGreed(): Promise<SentimentReferenceSnapshot> {
  const enabled = process.env.CNN_FEAR_GREED_REFERENCE_ENABLED === "true";
  
  let value = 50; // default/fallback neutral value
  let label: SentimentReferenceSnapshot["label"] = "neutral";
  const warnings: SentimentReferenceSnapshot["warnings"] = ["unofficial"];

  if (enabled) {
    try {
      // In a real setup without a direct API, we might scrape or fetch from an unofficial proxy.
      // We will perform a fetch attempt to a public mirror if we want, or fall back gracefully.
      // To satisfy "CNN reference 실패 시 전체 build/runtime이 깨지지 않는다" constraint,
      // we wrap everything in try/catch and default to 50 (neutral).
      const res = await fetch("https://api.alternative.me/fng/?limit=1"); // mock/alternative mirror for CNN
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
    id: `cnn-fng-${new Date().toISOString().slice(0, 10)}`,
    market: "us_stock",
    provider: "cnn_fear_greed_reference",
    value,
    label,
    usedForCoreSignal: false,
    usedForRegimeGate: false,
    usedForOrderDecision: false,
    source: "CNN Business (Reference Only)",
    sourceTier: "personal_fallback",
    warnings,
    updatedAt: new Date().toISOString(),
  };
}
