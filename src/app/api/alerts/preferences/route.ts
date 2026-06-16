import { NextRequest } from "next/server";
import { notificationHub } from "@/server/notifications/notification-hub";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function GET(request: NextRequest) {
  void request;
  try {
    const preferences = await notificationHub.getPreference();
    return createSafeResponse(preferences);
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = await notificationHub.updatePreference(body);
    return createSafeResponse(updated);
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 400);
  }
}

export const dynamic = "force-dynamic";
