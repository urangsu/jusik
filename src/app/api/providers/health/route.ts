import { NextRequest } from "next/server";
import { providerRegistry } from "@/server/providers/provider-registry";
import { providerBudgetManager } from "@/server/providers/provider-budget-manager";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function GET(request: NextRequest) {
  void request;
  try {
    const profiles = providerRegistry.getProfiles();
    const list = profiles.map((profile) => {
      const isEnabled = providerRegistry.isEnabled(profile.id);
      const budget = providerBudgetManager.getBudget(profile.id) || null;
      
      const subBudgets: unknown[] = [];
      if (profile.id === "kis") {
        const secondB = providerBudgetManager.getBudget("kis_second");
        const dailyB = providerBudgetManager.getBudget("kis_daily");
        if (secondB) subBudgets.push(secondB);
        if (dailyB) subBudgets.push(dailyB);
      }

      let status = isEnabled ? "healthy" : "disabled";
      if (profile.id === "opendart") {
        if (!process.env.OPENDART_API_KEY) {
          status = "api_required";
        } else if (process.env.OPENDART_ENABLED !== "true") {
          status = "disabled";
        } else {
          status = "configured";
        }
      }

      return {
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
      };
    });

    return createSafeResponse({ providers: list });
  } catch (err) {
    return createSafeResponse({ error: (err as Error).message }, 500);
  }
}

export const dynamic = "force-dynamic";
