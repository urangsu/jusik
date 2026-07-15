import { listMethodRules } from "./method-rule-registry";
import { evaluateMethodRule } from "@/domain/research/evaluate-method-rule";
import { synthesizeValidationReports } from "@/domain/research/synthesize-validation-reports";
import { buildThesisSnapshot } from "@/domain/research/build-thesis-snapshot";
import { listResearchClaims } from "./research-claim-store";
import { listResearchPosts } from "./research-voice-store";
import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";
import { getSymbolMasterRecord } from "../symbols/symbol-master-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { ThesisArcSnapshot } from "@/domain/research/thesis-snapshot";
import type { SynthesisResult } from "@/domain/research/synthesize-validation-reports";
import type { MethodRuleEvaluation } from "@/domain/research/method-evaluation";
import type { ResearchClaim } from "@/domain/research/research-claim";
import type { PublicResearchPost } from "@/domain/research/research-voice";
import type { SignalVersion } from "@/domain/signals/signal-version";

export type ResearchDiagnosticData = {
  thesisSnapshot: ThesisArcSnapshot;
  validationResult: SynthesisResult;
  evaluations: MethodRuleEvaluation[];
  claims: ResearchClaim[];
  voiceTimeline: PublicResearchPost[];
};

export async function getResearchDiagnosticData(
  assetId: string,
  asOfDate: string,
  signalVersion: SignalVersion,
): Promise<DataEnvelope<ResearchDiagnosticData | null>> {
  // 1. Fetch claims for this asset
  const claims = await listResearchClaims({ assetId });

  // If no claims exist for this asset, return insufficient_data immediately
  if (claims.length === 0) {
    return {
      value: null,
      status: "insufficient_data",
      source: "research_workspace_service",
      sourceTier: "manual_import",
      warnings: [],
      updatedAt: new Date().toISOString(),
      message: "공식 자료 또는 사용자 제공 리서치 기록이 연결되지 않았습니다.",
    };
  }

  // 2. Fetch related posts
  const postIdsForAsset = new Set(claims.map((c) => c.postId).filter(Boolean));
  const allPosts = await listResearchPosts();
  const voiceTimeline = allPosts.filter((p) => postIdsForAsset.has(p.postId));

  // 3. Resolve symbol and determine availability flags
  const symbolRecord = await getSymbolMasterRecord(assetId).catch(() => null);
  const market = symbolRecord?.market || "KR";

  const isKr = assetId.startsWith("KR_") || assetId.includes(".KS") || /^\d+$/.test(assetId);
  const universeId = isKr ? "KOSPI_SAMPLE" : "SP500_SAMPLE";

  // Check price availability
  const ohlcvEnv = await loadOhlcvHistory(universeId, assetId).catch(() => null);
  const priceAvailable = !!(ohlcvEnv && ohlcvEnv.value && ohlcvEnv.value.length > 0);

  // Valuation available (price + some financials)
  const valuationAvailable = priceAvailable;

  // Filings available (Symbol Master has corporate registrations or disclosures)
  const filingsAvailable = !!(symbolRecord && (symbolRecord.corpCode || symbolRecord.cik));

  // 4. Build evidenceMeta from claims
  const evidenceMeta: Record<string, { kind: string; expiryAt: string | null }> = {};
  for (const claim of claims) {
    for (const evId of claim.evidenceIds) {
      evidenceMeta[evId] = {
        kind: claim.claimKind, // use claimKind as the evidence kind
        expiryAt: claim.evidenceSpan ? claim.evidenceSpan.to : null,
      };
    }
  }

  // 5. Evaluate all 11 method rules
  const rules = listMethodRules();
  const evaluations = rules.map((rule) => {
    return evaluateMethodRule({
      rule,
      assetId,
      market,
      claims,
      evidenceMeta,
      asOfDate,
      signalVersion,
    });
  });

  // 6. Synthesize validation reports
  const validationResult = synthesizeValidationReports({
    assetId,
    evaluations,
    priceAvailable,
    valuationAvailable,
    filingsAvailable,
    signalVersion,
  });

  // 7. Build thesis pillars from evaluations
  // We map evaluations into pillars
  const pillars: ThesisArcSnapshot["pillars"] = evaluations
    .filter((e) => e.status !== "not_applicable")
    .map((e) => {
      // Map MethodRule status to ThesisPillarStatus
      let status: ThesisArcSnapshot["pillars"][0]["status"] = "unverified";
      if (e.status === "supported") status = "confirming";
      else if (e.status === "contradicted") status = "deteriorating";
      else if (e.status === "insufficient_data") status = "unverified";

      const matchedRule = rules.find((r) => r.ruleId === e.ruleId);

      return {
        pillarId: `pillar_${e.ruleId}`,
        assetId,
        title: matchedRule ? matchedRule.displayName : e.ruleId,
        methodRuleIds: [e.ruleId],
        status,
        claimIds: e.claimIds,
        confirmingEvidenceIds: e.supportingEvidenceIds,
        contradictingEvidenceIds: e.contradictingEvidenceIds,
        missingInputs: e.missingInputs,
        confirmIf: matchedRule ? matchedRule.confirmConditions : [],
        warnIf: matchedRule ? matchedRule.warningConditions : [],
        breakIf: matchedRule ? matchedRule.breakConditions : [],
        nextEvidenceDueAt: null,
        corePillar: e.ruleId === "demand_evidence" || e.ruleId === "gaap_financial_quality", // core pillars
      };
    });

  // Determine claim dates
  const sortedClaims = [...claims].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const firstClaimAt = sortedClaims[0]?.createdAt || null;
  const latestClaimAt = sortedClaims[sortedClaims.length - 1]?.createdAt || null;

  // Build snapshot
  const thesisSnapshot = buildThesisSnapshot({
    assetId,
    asOfDate,
    pillars,
    priceEvidenceAvailable: priceAvailable,
    valuationEvidenceAvailable: valuationAvailable,
    filingsAvailable,
    dataVersionIds: (ohlcvEnv as any)?.dataVersionId ? [(ohlcvEnv as any).dataVersionId] : ["ver_1"],
    signalVersion,
    firstClaimAt,
    latestClaimAt,
    changeReasons: [],
    requiredNextEvidence: [],
  });

  const value: ResearchDiagnosticData = {
    thesisSnapshot,
    validationResult,
    evaluations,
    claims,
    voiceTimeline,
  };

  return {
    value,
    status: "cached",
    source: "research_workspace_service",
    sourceTier: "manual_import",
    warnings: [],
    updatedAt: new Date().toISOString(),
  };
}
