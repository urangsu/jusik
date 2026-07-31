import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { checkProviderHealth } from "@/server/settings/provider-health-checker";
import { ProviderId } from "@/domain/settings/provider-id";
import { DataEnvelope } from "@/domain/common/data-status";
import { ProviderSettingSnapshot } from "@/domain/settings/provider-setting-snapshot";
import { PROVIDER_SETTING_DEFINITIONS } from "@/domain/settings/provider-setting-definition";
import { getProviderSettings } from "@/server/settings/provider-settings-store";

// Rate limiting & single-flight structures
const lastCheckedTimestamps = new Map<string, number>();
const inFlightHealthChecks = new Map<string, Promise<ProviderSettingSnapshot>>();
const cachedSnapshots = new Map<string, { snapshot: ProviderSettingSnapshot; expiresAt: number }>();

const COOLDOWN_MS = 3000; // 3 seconds minimum between live test executions
const CACHE_TTL_MS = 5000; // 5 seconds cache TTL

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;
    const isKnownProvider = PROVIDER_SETTING_DEFINITIONS.some((d) => d.providerId === providerId);

    if (!isKnownProvider) {
      const errorEnvelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "Provider Health Check API",
        sourceTier: "official",
        warnings: [],
        updatedAt: null,
        message: `Unknown providerId '${providerId}'.`,
      };
      return createSafeResponse(errorEnvelope, 400);
    }

    const now = Date.now();

    // 1. Check if we have an in-flight check for this provider (Single-Flight)
    const activeCheck = inFlightHealthChecks.get(providerId);
    if (activeCheck) {
      const snap = await activeCheck;
      const envelope: DataEnvelope<ProviderSettingSnapshot> = {
        value: snap,
        status: "cached",
        source: "Provider Health Check API",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
      };
      return createSafeResponse(envelope, 200);
    }

    // 2. Check if called within cooldown window (Rate Limit Protection)
    const lastTime = lastCheckedTimestamps.get(providerId) || 0;
    const cached = cachedSnapshots.get(providerId);

    if (now - lastTime < COOLDOWN_MS && cached && cached.expiresAt > now) {
      const envelope: DataEnvelope<ProviderSettingSnapshot> = {
        value: cached.snapshot,
        status: "cached",
        source: "Provider Health Check API",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
        message: "연결 테스트가 너무 자주 요청되었습니다. 최근 검사 결과를 반환합니다.",
      };
      return createSafeResponse(envelope, 200);
    }

    // 3. Initiate single-flight health check
    const checkPromise = checkProviderHealth(providerId as ProviderId);
    inFlightHealthChecks.set(providerId, checkPromise);

    try {
      const snap = await checkPromise;
      lastCheckedTimestamps.set(providerId, Date.now());
      cachedSnapshots.set(providerId, {
        snapshot: snap,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      const envelope: DataEnvelope<ProviderSettingSnapshot> = {
        value: snap,
        status: "real_time",
        source: "Provider Health Check API",
        sourceTier: "official",
        warnings: [],
        updatedAt: new Date().toISOString(),
      };
      return createSafeResponse(envelope, 200);
    } finally {
      inFlightHealthChecks.delete(providerId);
    }
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
