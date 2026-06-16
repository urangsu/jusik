import { NextRequest } from "next/server";
import { alertRuleEngine } from "@/server/alerts/alert-rule-engine";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await alertRuleEngine.updateRule(id, body);
    return createSafeResponse(updated);
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 400);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await alertRuleEngine.deleteRule(id);
    return createSafeResponse({ success: true });
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 400);
  }
}
