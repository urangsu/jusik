import type { FindingSynthesisReport, ReportSection } from "@/domain/report/report-section";
import { inspectForbiddenWording } from "../ai/forbidden-wording-guard";

export function synthesizeFindingReport(input: {
  subjectType: "asset" | "watchlist" | "audit";
  subjectId: string;
  sections: ReportSection[];
}): FindingSynthesisReport {
  const { subjectType, subjectId, sections } = input;
  const nowStr = new Date().toISOString();

  // Combine key risks and evidence gaps
  const keyRisks = sections
    .filter((s) => s.type === "risk")
    .map((s) => s.summary);

  const evidenceGaps = sections
    .filter((s) => s.type === "evidence_gap")
    .flatMap((s) => s.limitations);

  // Generate generic synthesis summary based on sections
  const secTitles = sections.map((s) => s.title).join(", ");
  const synthesisSummary = `진단 종합 레포트: ${subjectId}에 대한 ${sections.length}개 섹션 분석 (${secTitles}). 본 자료는 연구용 정보 기록이며 투자 권유나 추천이 아닙니다.`;

  // Perform wording check on all text fields
  const textsToCheck: string[] = [synthesisSummary, ...keyRisks, ...evidenceGaps];
  sections.forEach((s) => {
    textsToCheck.push(s.title);
    textsToCheck.push(s.summary);
  });

  const blockedTerms = new Set<string>();
  const blockReasons: string[] = [];
  let isBlocked = false;

  for (const text of textsToCheck) {
    const check = inspectForbiddenWording({ text });
    if (check.blocked) {
      isBlocked = true;
      check.blockedTerms.forEach((t) => blockedTerms.add(t));
      check.reasons.forEach((r) => {
        if (!blockReasons.includes(r)) {
          blockReasons.push(r);
        }
      });
    }
  }

  return {
    id: `fsr_${subjectId}_${Date.now()}`,
    subjectType,
    subjectId,
    sections,
    synthesisSummary,
    keyRisks,
    evidenceGaps,
    blockedTerms: Array.from(blockedTerms),
    isBlocked,
    blockReasons,
    createdAt: nowStr,
    engineVersion: "1.0.0",
  };
}
