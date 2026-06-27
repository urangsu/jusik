import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { observeOutcome } from "@/server/outcome/signal-outcome-observer";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";

/**
 * POST /api/outcomes/signal-journal/observe
 *
 * Body: { recordId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { recordId } = body;

    if (!recordId) {
      const envelope: DataEnvelope<null> = {
        value: null,
        status: "error",
        source: "signal_outcome_observer",
        sourceTier: "manual_import",
        warnings: [],
        updatedAt: null,
        message: "recordId is required",
      };
      return createSafeResponse(envelope, 400);
    }

    const record = await observeOutcome(recordId);

    const hasFailures = record.outcomeStatus === "error";
    const envelopeStatus = hasFailures ? "error" : "cached";

    const envelope: DataEnvelope<SignalOutcomeJournalRecord> = {
      value: record,
      status: envelopeStatus,
      source: "signal_outcome_observer",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: record.observedAt || record.createdAt,
      message: hasFailures ? record.lesson || undefined : undefined,
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
