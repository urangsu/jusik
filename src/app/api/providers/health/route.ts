import { NextRequest } from "next/server";
import { providerRegistry } from "@/server/providers/provider-registry";
import { providerBudgetManager } from "@/server/providers/provider-budget-manager";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getProviderSettings } from "@/server/settings/provider-settings-store";
import { ProviderId } from "@/domain/settings/provider-id";

export async function GET(request: NextRequest) {
  void request;
  try {
    const profiles = providerRegistry.getProfiles();
    const list = [];

    for (const profile of profiles) {
      let isEnabled = providerRegistry.isEnabled(profile.id);
      let status = isEnabled ? "healthy" : "disabled";

      let settingsProviderId: ProviderId | null = null;
      if (profile.id === "opendart") settingsProviderId = "opendart";
      else if (profile.id === "kis") settingsProviderId = "kis";
      else if (profile.id === "fmp_free") settingsProviderId = "fmp";
      else if (profile.id === "finnhub_free") settingsProviderId = "finnhub";
      else if (profile.id === "alpha_vantage_free") settingsProviderId = "alpha_vantage";

      if (settingsProviderId) {
        try {
          const snap = await getProviderSettings(settingsProviderId);
          isEnabled = snap.enabled;
          status = snap.status === "not_configured" ? "api_required" : snap.status;
        } catch {
          // fallback
        }
      }

      const budget = providerBudgetManager.getBudget(profile.id) || null;
      
      const subBudgets: unknown[] = [];
      if (profile.id === "kis") {
        const secondB = providerBudgetManager.getBudget("kis_second");
        const dailyB = providerBudgetManager.getBudget("kis_daily");
        if (secondB) subBudgets.push(secondB);
        if (dailyB) subBudgets.push(dailyB);
      }

      list.push({
        id: profile.id,
        displayName: profile.displayName,
        tier: profile.tier,
        markets: profile.markets,
        capabilities: profile.capabilities,
        requiresApiKey: profile.requiresApiKey,
        isEnabled,
        status,
        budget,
        subBudgets: subBudgets.length > 0 ? subBudgets : undefined,
      });
    }

    return createSafeResponse({ providers: list });
  } catch (err) {
    return createSafeResponse({ error: (err as Error).message }, 500);
  }
}

export const dynamic = "force-dynamic";
