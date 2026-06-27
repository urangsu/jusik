import { NextRequest } from "next/server";
import { createSafeResponse } from "@/server/security/safe-api-response";
import { listOutcomeRecords } from "@/server/outcome/signal-outcome-journal-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";

/**
 * GET /api/outcomes/signal-journal
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId") || undefined;
    const subjectType = searchParams.get("subjectType") || undefined;

    const list = await listOutcomeRecords({ subjectId, subjectType });

    const envelope: DataEnvelope<SignalOutcomeJournalRecord[]> = {
      value: list,
      status: "cached",
      source: "signal_outcome_journal_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
    };

    return createSafeResponse(envelope, 200);
  } catch (err: any) {
    const envelope: DataEnvelope<null> = {
      value: null,
      status: "error",
      source: "signal_outcome_journal_store",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: null,
      message: err.message || "서버 오류",
    };
    return createSafeResponse(envelope, 500);
  }
}
