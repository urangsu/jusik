import { NextRequest } from "next/server";
import { macroPlaybookStore } from "@/server/macro/macro-playbook-store";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { DataEnvelope } from "@/domain/common/data-status";

export async function GET(request: NextRequest) {
  try {
    const notes = await macroPlaybookStore.getNotes();

    const envelope: DataEnvelope<any> = {
      value: {
        author: "Baek Chan-gyu (NH Investment & Securities)",
        notes,
      },
      status: "cached",
      source: "Macro Playbook Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Macro Playbook Store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
