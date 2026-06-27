import type { SignalOutcomeJournalRecord } from "@/domain/outcome/signal-outcome-journal";

export function compressOutcomeMemory(records: SignalOutcomeJournalRecord[]): {
  lessons: string[];
  confidenceAdjustments: Record<string, string>;
  evidenceGaps: string[];
} {
  const lessons: string[] = [];
  const confidenceAdjustments: Record<string, string> = {};
  const evidenceGaps: string[] = [];

  const observed = records.filter((r) => r.outcomeStatus === "observed");
  const insufficient = records.filter((r) => r.outcomeStatus === "insufficient_data");

  // Summarize observed performance
  if (observed.length > 0) {
    const outperformedCount = observed.filter((r) => r.confidenceAdjustment === "increase").length;
    const underperformedCount = observed.filter((r) => r.confidenceAdjustment === "decrease").length;

    lessons.push(
      `Analyzed ${observed.length} outcomes: ${outperformedCount} outperformed, ${underperformedCount} underperformed relative to indices.`
    );

    observed.forEach((r) => {
      if (r.subjectId) {
        confidenceAdjustments[r.subjectId] = r.confidenceAdjustment;
      }
      if (r.lesson) {
        lessons.push(`[${r.subjectId}] ${r.lesson}`);
      }
    });
  } else {
    lessons.push("No observed outcome records available for compression.");
  }

  // Collect evidence gaps from insufficient data reports
  if (insufficient.length > 0) {
    insufficient.forEach((r) => {
      evidenceGaps.push(`Missing data for subject "${r.subjectId}" under horizon ${r.horizon}.`);
    });
  }

  return {
    lessons,
    confidenceAdjustments,
    evidenceGaps,
  };
}
