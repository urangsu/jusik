import { NextRequest } from "next/server";
import { kisConfig } from "@/server/providers/kis/kis-config";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { providerBudgetManager } from "@/server/providers/provider-budget-manager";

export async function GET(request: NextRequest) {
  void request;
  try {
    const isConfigured = kisConfig.isConfigured;
    const dailyBudget = providerBudgetManager.getBudget("kis_daily");
    const secondBudget = providerBudgetManager.getBudget("kis_second");

    return createSafeResponse({
      configured: isConfigured,
      appType: kisConfig.appType,
      restUrl: kisConfig.restUrl,
      tradingEnabled: kisConfig.isTradingEnabled,
      orderRouteEnabled: kisConfig.isOrderRouteEnabled,
      dailyBudget,
      secondBudget,
    });
  } catch (err) {
    return createSafeResponse({ error: (err as Error).message }, 500);
  }
}

export const dynamic = "force-dynamic";
