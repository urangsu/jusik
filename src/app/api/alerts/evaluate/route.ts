import { NextRequest } from "next/server";
import { alertEvaluator } from "@/server/alerts/alert-evaluator";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function POST(request: NextRequest) {
  void request;
  try {
    const triggeredIds = await alertEvaluator.evaluateAll();
    return createSafeResponse({ success: true, triggeredCount: triggeredIds.length, triggeredIds });
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 500);
  }
}

export const dynamic = "force-dynamic";
