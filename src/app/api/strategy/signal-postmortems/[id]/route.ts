import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { getSignalPostmortemById } from "@/server/strategy/signal-postmortem-store";
import { DataEnvelope } from "@/domain/common/data-status";
import { SignalPostmortem } from "@/domain/strategy/signal-postmortem";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postmortem = await getSignalPostmortemById(id);

    if (!postmortem) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "not_found",
        source: "Signal Postmortems API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: `SignalPostmortem '${id}' not found`,
      };
      return createSafeResponse(envelope, 404);
    }

    const envelope: DataEnvelope<SignalPostmortem> = {
      value: postmortem,
      status: "cached",
      source: "Signal Postmortems API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Signal Postmortems API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}
