import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { saveVoiceProfile, listVoiceProfiles } from "@/server/research/research-voice-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { ResearchVoiceProfile } from "@/domain/research/research-voice";

/**
 * GET /api/research/voices
 * Lists all voice profiles.
 */
export async function GET(request: NextRequest) {
  try {
    const list = await listVoiceProfiles();

    const envelope: DataEnvelope<ResearchVoiceProfile[]> = {
      value: list,
      status: "cached",
      source: "research_voice_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "research_voice_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "Server Error",
    };
    return createSafeResponse(envelope, 500);
  }
}

import { checkResearchWriteGuard, makeResearchWriteErrorEnvelope } from "@/server/security/research-write-guard";

const ID_REGEX = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/**
 * POST /api/research/voices
 * Registers or updates a voice profile.
 */
export async function POST(request: NextRequest) {
  try {
    const guard = checkResearchWriteGuard();
    if (!guard.allowed) {
      return createSafeResponse(makeResearchWriteErrorEnvelope(guard.status, guard.message), guard.status);
    }

    const body = await request.json().catch(() => ({}));
    const { voiceId, displayName, publicHandle, sourcePlatforms, affiliationStatus } = body;

    if (!voiceId || !displayName || !publicHandle) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "research_voice_store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "voiceId, displayName, and publicHandle are required.",
      };
      return createSafeResponse(envelope, 400);
    }

    if (!ID_REGEX.test(voiceId)) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "research_voice_store",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: `voiceId "${voiceId}" is not in valid format.`,
      };
      return createSafeResponse(envelope, 400);
    }

    const profile: ResearchVoiceProfile = {
      voiceId,
      displayName,
      publicHandle,
      sourcePlatforms: sourcePlatforms || [],
      affiliationStatus: affiliationStatus || "independent_tracker",
      productionEligible: false,
    };

    await saveVoiceProfile(profile);

    const envelope: DataEnvelope<ResearchVoiceProfile> = {
      value: profile,
      status: "cached",
      source: "research_voice_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "research_voice_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "Server Error",
    };
    return createSafeResponse(envelope, 500);
  }
}
