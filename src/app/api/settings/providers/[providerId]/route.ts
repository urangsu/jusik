import { NextRequest } from "next/server";
import { createSafeResponse } from "../../../../../server/security/safe-api-response";
import { getProviderSettings, updateProviderSettings } from "../../../../../server/settings/provider-settings-store";
import { checkSettingsWriteEnabled } from "../../../../../server/security/settings-write-guard";
import { ProviderId } from "../../../../../domain/settings/provider-id";
import { DataEnvelope } from "../../../../../domain/common/data-status";
import { ProviderSettingSnapshot } from "../../../../../domain/settings/provider-setting-snapshot";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;
    const snap = await getProviderSettings(providerId as ProviderId);
    const envelope: DataEnvelope<ProviderSettingSnapshot> = {
      value: snap,
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await params;
  
  const guard = checkSettingsWriteEnabled({
    routeName: `settings/providers/${providerId}`,
  });
  if (guard) return guard;

  try {
    const body = await request.json();
    const values = body.values || {};

    const updated = await updateProviderSettings(providerId as ProviderId, values);
    const envelope: DataEnvelope<ProviderSettingSnapshot> = {
      value: updated,
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
