import { NextRequest } from "next/server";
import { brokerageService } from "@/server/services/brokerage-service";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function GET(request: NextRequest) {
  void request;
  try {
    const balance = await brokerageService.getBalance();
    return createSafeResponse(balance);
  } catch (err) {
    return createSafeResponse({ error: (err as Error).message }, 500);
  }
}

export const dynamic = "force-dynamic";
