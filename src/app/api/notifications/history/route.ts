import { NextRequest } from "next/server";
import { notificationDeliveryStore } from "@/server/notifications/notification-delivery-store";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function GET(request: NextRequest) {
  void request;
  try {
    const deliveries = await notificationDeliveryStore.getDeliveries();
    const sorted = [...deliveries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return createSafeResponse({ deliveries: sorted });
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 500);
  }
}

export const dynamic = "force-dynamic";
