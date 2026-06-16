import { NextRequest } from "next/server";
import { kisConfig } from "@/server/providers/kis/kis-config";
import { brokerageService } from "@/server/services/brokerage-service";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function POST(request: NextRequest) {
  // 1. Route entry check - Block BEFORE importing or executing downstream logic
  if (!kisConfig.isOrderRouteEnabled) {
    return createSafeResponse(
      {
        error: "Forbidden: Order routing is strictly disabled under current read-only specifications.",
      },
      403
    );
  }

  try {
    const body = await request.json();
    const result = await brokerageService.placeOrder(body);
    return createSafeResponse(result);
  } catch (err) {
    return createSafeResponse({ error: (err as Error).message }, 500);
  }
}

export const dynamic = "force-dynamic";
