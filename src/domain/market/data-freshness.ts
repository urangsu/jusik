import { Market } from "./exchange";

export type DataFreshness = "fresh" | "delayed" | "stale" | "unknown";

export function classifyFreshness(params: {
  updatedAt: string | null;
  now: string;
  market: Market;
  interval: "quote" | "ohlcv";
}): DataFreshness {
  if (!params.updatedAt) return "unknown";

  const updatedAt = Date.parse(params.updatedAt);
  const now = Date.parse(params.now);
  if (!Number.isFinite(updatedAt) || !Number.isFinite(now) || updatedAt > now) return "unknown";

  const ageMinutes = (now - updatedAt) / 60000;
  const freshThreshold = params.interval === "quote" ? 20 : 1440;
  const staleThreshold = params.interval === "quote" ? 60 : 4320;

  if (ageMinutes <= freshThreshold) return "fresh";
  if (ageMinutes <= staleThreshold) return "delayed";
  return "stale";
}
