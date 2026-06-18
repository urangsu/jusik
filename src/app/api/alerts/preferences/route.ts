import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { alertPreferenceStore } from "@/server/alerts/alert-preference-store";
import { checkSettingsWriteEnabled } from "@/server/security/settings-write-guard";
import { DataEnvelope } from "@/domain/common/data-status";

export async function GET(_request: NextRequest) {
  try {
    const prefs = await alertPreferenceStore.getPreferences();
    const envelope: DataEnvelope<typeof prefs> = {
      value: prefs,
      status: "cached",
      source: "Alert Preferences Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Alert Preferences Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export async function POST(request: NextRequest) {
  const guard = checkSettingsWriteEnabled({
    routeName: "alerts/preferences",
  });
  if (guard) return guard;

  try {
    const body = await request.json();
    const prefs = await alertPreferenceStore.savePreferences(body);
    const envelope: DataEnvelope<typeof prefs> = {
      value: prefs,
      status: "cached",
      source: "Alert Preferences Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    return createSafeResponse(envelope);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "Alert Preferences Store",
      sourceTier: "official",
      warnings: [],
      updatedAt: null,
      message: err?.message || String(err),
    };
    return createSafeResponse(envelope, 500);
  }
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}

export const dynamic = "force-dynamic";
