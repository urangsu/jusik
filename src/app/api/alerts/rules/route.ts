import { NextRequest } from "next/server";
import { alertRuleEngine } from "@/server/alerts/alert-rule-engine";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function GET(request: NextRequest) {
  void request;
  try {
    const rules = await alertRuleEngine.getRules();
    return createSafeResponse({ rules });
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newRule = await alertRuleEngine.createRule(body);
    return createSafeResponse(newRule, 201);
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 400);
  }
}

export const dynamic = "force-dynamic";
