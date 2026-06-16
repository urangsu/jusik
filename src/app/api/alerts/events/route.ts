import { NextRequest } from "next/server";
import { alertEventStore } from "@/server/alerts/alert-event-store";
import { createSafeResponse } from "@/server/security/safe-api-response";

export async function GET(request: NextRequest) {
  void request;
  try {
    const events = await alertEventStore.getEvents();
    // Sort events newest first
    const sorted = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return createSafeResponse({ events: sorted });
  } catch (err: any) {
    return createSafeResponse({ error: err.message }, 500);
  }
}

export const dynamic = "force-dynamic";
