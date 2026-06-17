import { NextRequest } from "next/server";
import { createSafeResponse } from "../../../../../../server/security/safe-api-response";
import { checkProviderHealth } from "../../../../../../server/settings/provider-health-checker";
import { ProviderId } from "../../../../../../domain/settings/provider-id";
import { DataEnvelope } from "../../../../../../domain/common/data-status";
import { ProviderSettingSnapshot } from "../../../../../../domain/settings/provider-setting-snapshot";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;
    const snap = await checkProviderHealth(providerId as ProviderId);
    const envelope: DataEnvelope<ProviderSettingSnapshot> = {
      value: snap,
      status: "cached",
      source: "Provider Health Check API",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Provider Health Check API",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export const dynamic = "force-dynamic";
