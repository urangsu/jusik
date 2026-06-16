import { ProviderBudgetWindow } from "@/domain/source/provider-budget";
import { kisConfig } from "./kis-config";

export interface KisRateLimitRule {
  id: string;
  window: ProviderBudgetWindow;
  limit: number;
}

/**
 * Returns the rate limit rules for the KIS API provider.
 */
export function getKisRateLimitRules(): KisRateLimitRule[] {
  // Paper account has a limit of 2 requests per second. Real accounts have 20.
  const secondLimit = kisConfig.appType === "paper" ? 2 : 20;
  const dailyLimit = kisConfig.dailyLimit;

  return [
    {
      id: "kis_second",
      window: "second",
      limit: secondLimit,
    },
    {
      id: "kis_daily",
      window: "day",
      limit: dailyLimit,
    },
  ];
}
