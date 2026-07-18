/**
 * Research Workspace Service
 *
 * Computes the ResearchDiagnosticData for a given asset.
 *
 * Strict rules:
 * 1. universeId must be provided explicitly — never inferred from assetId string.
 * 2. valuationAvailable is INDEPENDENT of priceAvailable.
 * 3. filingsAvailable requires real filing records, NOT just corpCode/CIK.
 * 4. supplyChainGraph=null when no real graph is stored.
 * 5. signalVersion=null when no real version is stored.
 * 6. dataVersionIds=[] when no real versions are found.
 * 7. dv_default, ver_1, sv_research_workspace must never be used.
 */

import { listMethodRules } from "./method-rule-registry";
import { evaluateMethodRule } from "@/domain/research/evaluate-method-rule";
import { synthesizeValidationReports } from "@/domain/research/synthesize-validation-reports";
import { buildThesisSnapshot } from "@/domain/research/build-thesis-snapshot";
import { listResearchClaims } from "./research-claim-store";
import { listResearchPosts } from "./research-voice-store";
import { listEvidenceRecordsForAsset } from "./research-evidence-store";
import { loadOhlcvHistory } from "../factors/ohlcv-history-loader";
import { getSymbolMasterRecord } from "../symbols/symbol-master-store";
import { getRecentFilings } from "../filings/filing-event-store";
import type { DataEnvelope } from "@/domain/common/data-status";
import type { ThesisArcSnapshot } from "@/domain/research/thesis-snapshot";
import type { SynthesisResult } from "@/domain/research/synthesize-validation-reports";
import type { MethodRuleEvaluation } from "@/domain/research/method-evaluation";
import type { ResearchClaim } from "@/domain/research/research-claim";
import type { PublicResearchPost } from "@/domain/research/research-voice";
import type { SignalVersion } from "@/domain/signals/signal-version";
import type { SupplyChainGraph } from "@/domain/research/supply-chain-graph";
import type { ResearchAvailability, AvailabilityEvidence } from "@/domain/research/research-availability";
import type { ResearchEvidenceRecord } from "@/domain/research/research-evidence-record";
import type { SourceWarning } from "@/domain/source/provider-tier";

export type GetResearchDiagnosticDataInput = {
  assetId: string;
  asOfDate: string;
  /** Must be explicitly provided. Never auto-inferred from assetId string pattern. */
  universeId: string;
};

export type ResearchDiagnosticData = {
  thesisSnapshot: ThesisArcSnapshot;
  validationResult: SynthesisResult;
  evaluations: MethodRuleEvaluation[];
  claims: ResearchClaim[];
  voiceTimeline: PublicResearchPost[];
  supplyChainGraph: SupplyChainGraph | null;
  availability: ResearchAvailability;
  signalVersion: SignalVersion | null;
  dataVersionIds: string[];
  evidenceRecords: ResearchEvidenceRecord[];
};

function makeUnavailable(
  reasonCode: AvailabilityEvidence["reasonCode"],
  asOfDate: string
): AvailabilityEvidence {
  return {
    available: false,
    status: "insufficient_data",
    sourceRefs: [],
    updatedAt: null,
    asOfDate,
    reasonCode,
  };
}

function makeAvailable(sourceRefs: string[], updatedAt: string, asOfDate: string): AvailabilityEvidence {
  return {
    available: true,
    status: "cached",
    sourceRefs,
    updatedAt,
    asOfDate,
    reasonCode: null,
  };
}

export async function getResearchDiagnosticData(
  input: GetResearchDiagnosticDataInput
): Promise<DataEnvelope<ResearchDiagnosticData | null>> {
  const { assetId, asOfDate, universeId } = input;

  // 1. Fetch claims for this asset
  const claims = await listResearchClaims({ assetId });

  // If no claims exist, return immediately with insufficient_data
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

  // 2. Fetch related posts (voice timeline)
  const postIdsForAsset = new Set(claims.map((c) => c.postId).filter(Boolean));
  const allPosts = await listResearchPosts();
  const voiceTimeline = allPosts.filter((p) => postIdsForAsset.has(p.postId));

  // 3. Resolve symbol — used for market context only (no universe inference)
  const symbolRecord = await getSymbolMasterRecord(assetId).catch(() => null);
  const market: "KR" | "US" = (symbolRecord?.market as "KR" | "US") ?? "KR";

  // 4. Resolve availability — independently for each category

  // 4a. Price availability: requires real OHLCV data (value != null && length > 0)
  const ohlcvEnv = await loadOhlcvHistory(universeId, assetId).catch(() => null);
  const ohlcvRecords = ohlcvEnv?.value ?? null;
  const priceAvail: AvailabilityEvidence =
    ohlcvRecords && ohlcvRecords.length > 0
      ? makeAvailable([], new Date().toISOString(), asOfDate)
      : makeUnavailable("price_data_unavailable", asOfDate);

  // 4b. Valuation availability: requires a real valuation metric store
  //     Currently no valuation metric store — explicitly unavailable
  const valuationAvail: AvailabilityEvidence = makeUnavailable("valuation_metrics_unavailable", asOfDate);

  // 4c. Filings availability: requires real filing records with receiptNo
  //     corpCode/CIK alone is NOT sufficient
  // Extract stockCode from assetId (e.g. KR_005930 → 005930)
  const stockCode = assetId.startsWith("KR_")
    ? assetId.replace("KR_", "")
    : assetId.startsWith("US_")
    ? assetId.replace("US_", "")
    : null;

  const filingRecords = stockCode
    ? await getRecentFilings({ stockCode, limit: 5 }).catch(() => [])
    : [];

  const hasRealFiling = filingRecords.some(
    (f) =>
      f.receiptNo &&
      f.dataAvailableAt &&
      f.dataAvailableAt <= asOfDate
  );
  const filingsAvail: AvailabilityEvidence = hasRealFiling
    ? makeAvailable(
        filingRecords.slice(0, 3).map((f) => f.receiptNo),
        new Date().toISOString(),
        asOfDate
      )
    : makeUnavailable("filings_unavailable", asOfDate);

  // 4d. Supply chain availability: requires a real stored graph (none yet)
  const supplyChainAvail: AvailabilityEvidence = makeUnavailable("supply_chain_graph_unavailable", asOfDate);
  const supplyChainGraph: SupplyChainGraph | null = null;

  const availability: ResearchAvailability = {
    price: priceAvail,
    valuation: valuationAvail,
    filings: filingsAvail,
    supplyChain: supplyChainAvail,
  };

  // 5. Resolve provenance — signalVersion and dataVersionIds from actual stores
  //    Currently no signal history store for research workspace: return null / []
  const signalVersion: SignalVersion | null = null;
  const dataVersionIds: string[] = [];

  // 6. Fetch evidence records referenced by claims
  const allEvidenceRecords = await listEvidenceRecordsForAsset(assetId);
  // Filter to only evidence IDs referenced by claims
  const referencedEvidenceIds = new Set(claims.flatMap((c) => c.evidenceIds));
  const evidenceRecords = allEvidenceRecords.filter((ev) =>
    referencedEvidenceIds.has(ev.evidenceId)
  );

  // 7. Build evidenceMeta from claims (for method rule evaluation)
  const evidenceMeta: Record<string, { kind: string; expiryAt: string | null }> = {};
  for (const claim of claims) {
    for (const evId of claim.evidenceIds) {
      evidenceMeta[evId] = {
        kind: claim.claimKind,
        expiryAt: claim.evidenceSpan ? claim.evidenceSpan.to : null,
      };
    }
  }

  // 8. Evaluate all 11 method rules
  const rules = listMethodRules();
  const evaluations = rules.map((rule) =>
    evaluateMethodRule({
      rule,
      assetId,
      market,
      claims,
      evidenceMeta,
      asOfDate,
      signalVersion,
    })
  );

  // 9. Synthesize validation reports using structured availability
  const validationResult = synthesizeValidationReports({
    assetId,
    evaluations,
    availability,
    signalVersion,
  });

  // 10. Build thesis pillars from evaluations
  const pillars: ThesisArcSnapshot["pillars"] = evaluations
    .filter((e) => e.status !== "not_applicable")
    .map((e) => {
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
        corePillar: e.ruleId === "demand_evidence" || e.ruleId === "gaap_financial_quality",
      };
    });

  const sortedClaims = [...claims].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const firstClaimAt = sortedClaims[0]?.createdAt ?? null;
  const latestClaimAt = sortedClaims[sortedClaims.length - 1]?.createdAt ?? null;

  const thesisSnapshot = buildThesisSnapshot({
    assetId,
    asOfDate,
    pillars,
    priceEvidenceAvailable: priceAvail.available,
    valuationEvidenceAvailable: valuationAvail.available,
    filingsAvailable: filingsAvail.available,
    dataVersionIds,
    signalVersion,
    firstClaimAt,
    latestClaimAt,
    changeReasons: [],
    requiredNextEvidence: [],
  });

  const warnings: SourceWarning[] = ["manual_import_required"];
  if (!signalVersion) warnings.push("unofficial");
  // Note: string warnings like "provenance_unavailable" cannot be used here;
  // SourceWarning is a union type. Provenance info is available in the envelope status.

  const value: ResearchDiagnosticData = {
    thesisSnapshot,
    validationResult,
    evaluations,
    claims,
    voiceTimeline,
    supplyChainGraph,
    availability,
    signalVersion,
    dataVersionIds,
    evidenceRecords,
  };

  return {
    value,
    status: "cached",
    source: "research_workspace_service",
    sourceTier: "manual_import",
    warnings,
    updatedAt: new Date().toISOString(),
  };
}
