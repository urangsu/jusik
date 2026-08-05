import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { createPendingOutcomeRecord } from "@/server/outcome/signal-outcome-observer";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";

/**
 * POST /api/outcomes/signal-journal/pending
 *
 * Body: { subjectType, subjectId, assetId, signalId, horizon, evidencePackIds }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      subjectType,
      subjectId,
      assetId,
      universeId,
      observationStartedAt,
      signalId,
      horizon,
      evidencePackIds,
    } = body;

    if (!subjectType || !subjectId || !assetId || !universeId || !observationStartedAt || !horizon) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "signal_outcome_observer",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "subjectType, subjectId, assetId, universeId, observationStartedAt, and horizon are required",
      };
      return createSafeResponse(envelope, 400);
    }

    const record = await createPendingOutcomeRecord({
      subjectType,
      subjectId,
      assetId,
      universeId,
      observationStartedAt,
      signalId,
      horizon,
      evidencePackIds,
    });

    const envelope: DataEnvelope<SignalOutcomeJournalRecord> = {
      value: record,
      status: "cached",
      source: "signal_outcome_observer",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: record.createdAt,
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "signal_outcome_observer",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}
