import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { alertEventStore } from "@/server/alerts/alert-event-store";
import { DataEnvelope } from "@/domain/common/data-status";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await alertEventStore.markAlertRead(id);

    const envelope: DataEnvelope<boolean> = {
      value: true,
      status: "cached",
      source: "Alert Event Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Alert Event Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
