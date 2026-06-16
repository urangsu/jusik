import { ProviderErrorCondition } from "@/domain/alerts/alert-condition";
import { providerRegistry } from "../providers/provider-registry";
import { providerBudgetManager } from "../providers/provider-budget-manager";
import { providerHealthStore } from "../providers/provider-health-store";

export type ProviderAlertEvaluation = {
  triggered: boolean;
  providerId?: string;
  status?: string;
  message?: string;
  source?: string;
  sourceTier?: string;
  dataStatus?: string;
  warnings?: string[];
  updatedAt?: string | null;
};

export class ProviderAlertEngine {
  async evaluate(params: {
    condition: ProviderErrorCondition;
  }): Promise<ProviderAlertEvaluation[]> {
    const { condition } = params;
    const results: ProviderAlertEvaluation[] = [];

    for (const providerId of condition.providerIds) {
      // 1. Check if rate limited via budget manager
      const isAllowed = providerBudgetManager.isAllowed(providerId);
      if (!isAllowed && condition.statuses.includes("rate_limited")) {
        results.push({
          triggered: true,
          providerId,
          status: "rate_limited",
          message: `${providerId} has exceeded its budget / call limits.`,
          dataStatus: "rate_limited",
          updatedAt: new Date().toISOString()
        });
        continue;
      }

      // 2. Check if API credentials are required but not configured (api_required)
      const isEnabled = providerRegistry.isEnabled(providerId);
      if (!isEnabled && condition.statuses.includes("api_required")) {
        const profile = providerRegistry.getProfile(providerId);
        if (profile?.requiresApiKey) {
          results.push({
            triggered: true,
            providerId,
            status: "api_required",
            message: `${providerId} API key is not configured.`,
            dataStatus: "api_required",
            updatedAt: new Date().toISOString()
          });
          continue;
        }
      }

      // 3. Check health status in providerHealthStore
      const health = await providerHealthStore.getHealth(providerId);
      if (health && condition.statuses.includes(health.status as any)) {
        results.push({
          triggered: true,
          providerId,
          status: health.status,
          message: health.lastErrorMsg || `${providerId} returned status ${health.status}`,
          dataStatus: health.status,
          updatedAt: health.lastUpdatedAt
        });
        continue;
      }
    }

    return results;
  }
}

export const providerAlertEngine = new ProviderAlertEngine();
