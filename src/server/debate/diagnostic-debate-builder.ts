import type { DiagnosticDebateReport, DiagnosticDebateCase, DiagnosticCaseType } from "@/domain/debate/diagnostic-debate";
import type { EvidencePack } from "@/domain/evidence/evidence-pack";
import type { ReportSection } from "@/domain/report/report-section";
import { inspectForbiddenWording } from "../ai/forbidden-wording-guard";

export function buildDiagnosticDebate(input: {
  evidencePacks: EvidencePack[];
  sections: ReportSection[];
  subjectId?: string;
  subjectType?: "asset" | "watchlist" | "audit";
}): DiagnosticDebateReport {
  const { evidencePacks, sections } = input;
  const nowStr = new Date().toISOString();

  const firstPack = evidencePacks[0];
  const resolvedSubjectId = input.subjectId || (firstPack ? firstPack.subjectId : "unknown");
  const resolvedSubjectType = input.subjectType || (firstPack
    ? (firstPack.subjectType === "report" ? "watchlist" : "audit")
    : "audit");

  const evidencePackIds = evidencePacks.map((p) => p.id);
  const reportSectionIds = sections.map((s) => s.id);

  // 1. Build deterministic cases based on section types
  const cases: DiagnosticDebateCase[] = [];

  // Bull Case
  const bullSections = sections.filter((s) => s.type === "technical" || s.type === "flow");
  cases.push({
    id: `case_${resolvedSubjectId}_bull`,
    type: "bull_case",
    title: "Bull Case Diagnosis",
    summary: bullSections.length > 0
      ? `긍정적 시장 요인 분석: ${bullSections.map((s) => s.title).join(", ")}에 기반한 양호한 시계열 흐름 감지.`
      : "긍정적 요인을 감지할 만한 관련 신호 분석 자료가 불충분합니다.",
    evidencePackIds,
    reportSectionIds,
    strength: bullSections.length > 0 ? "medium" : "low",
    limitations: [],
    warnings: [],
  });

  // Bear Case
  const bearSections = sections.filter((s) => s.type === "risk" || s.type === "market");
  cases.push({
    id: `case_${resolvedSubjectId}_bear`,
    type: "bear_case",
    title: "Bear Case Diagnosis",
    summary: bearSections.length > 0
      ? `부정적/보수적 요인 분석: ${bearSections.map((s) => s.title).join(", ")}에 기반한 위험 및 변동성 노출 경고.`
      : "보수적 위험 요인을 나타내는 관련 신호 분석 자료가 아직 검출되지 않았습니다.",
    evidencePackIds,
    reportSectionIds,
    strength: bearSections.length > 0 ? "medium" : "low",
    limitations: [],
    warnings: [],
  });

  // Neutral Risk
  const neutralSections = sections.filter((s) => s.type === "financial" || s.type === "filing");
  cases.push({
    id: `case_${resolvedSubjectId}_neutral`,
    type: "neutral_risk",
    title: "Neutral Risk Points",
    summary: neutralSections.length > 0
      ? `중립적 펀더멘탈 및 특이공시 검토: ${neutralSections.map((s) => s.title).join(", ")} 항목 확인.`
      : "펀더멘탈 및 공시 정보 기반의 특이 중립 요인이 확인되지 않았습니다.",
    evidencePackIds,
    reportSectionIds,
    strength: "medium",
    limitations: [],
    warnings: [],
  });

  // Evidence Gap
  const gapSections = sections.filter((s) => s.type === "evidence_gap");
  const allMissing = evidencePacks.flatMap((p) => p.missingEvidence);
  cases.push({
    id: `case_${resolvedSubjectId}_gap`,
    type: "evidence_gap",
    title: "Evidence Gaps & Data Gaps",
    summary: allMissing.length > 0
      ? `자료 검증 한계 분석: 누락 키(${allMissing.join(", ")})로 인한 신뢰도 제약 요인 존재.`
      : "감사 대상 증거 자료가 정합성 있게 충족되었습니다.",
    evidencePackIds,
    reportSectionIds,
    strength: allMissing.length > 0 ? "high" : "low",
    limitations: allMissing.map((m) => `Missing key: ${m}`),
    warnings: allMissing.length > 0 ? ["incomplete_data"] : [],
  });

  const balanceSummary = `본 진단 대비표는 ${resolvedSubjectId}에 대한 다각도 신호 균형 진단 정보만을 제공합니다. 본 자료는 연구용 정보 기록이며 투자 권유나 추천이 아닙니다.`;
  const unresolvedQuestions = allMissing.length > 0
    ? [`누락된 정보(${allMissing.join(", ")})의 실제 런타임 데이터 업데이트 여부`, "시계열 이상 변동성 추가 검증 필요"]
    : ["추가적인 팩터 간 상관관계 다중공선성 영향성 검토"];

  // Perform wording check on all text fields
  const textsToCheck: string[] = [balanceSummary, ...unresolvedQuestions];
  cases.forEach((c) => {
    textsToCheck.push(c.title);
    textsToCheck.push(c.summary);
  });
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
    id: `deb_${resolvedSubjectId}_${Date.now()}`,
    subjectType: resolvedSubjectType,
    subjectId: resolvedSubjectId,
    cases,
    balanceSummary,
    unresolvedQuestions,
    blockedTerms: Array.from(blockedTerms),
    isBlocked,
    blockReasons,
    createdAt: nowStr,
  };
}
