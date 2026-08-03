import { NextRequest } from "next/server";
import { createSafeResponse } from "../../../../server/security/safe-api-response";
import { listProviderSettings } from "../../../../server/settings/provider-settings-store";
import { DataEnvelope } from "../../../../domain/common/data-status";
import { ProviderSettingSnapshot } from "../../../../domain/settings/provider-setting-snapshot";

import { requireProviderAdmin } from "../../../../server/security/provider-admin-guard";

export async function GET(request: NextRequest) {
  const guard = requireProviderAdmin(request);
  if (!guard.authorized) {
    return guard.response;
  }

  try {
    const list = await listProviderSettings();
    const envelope: DataEnvelope<ProviderSettingSnapshot[]> = {
      value: list,
      status: "cached",
      source: "Provider Settings API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Provider Settings API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
