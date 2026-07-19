import type { DataEnvelope } from "@/domain/common/data-status";
import type { SourceWarning } from "@/domain/source/provider-tier";
import type { SignalVersion } from "@/domain/signals/signal-version";
import { getSymbolMasterRecord } from "@/server/symbols/symbol-master-store";
import { getRecentFilings } from "@/server/filings/filing-event-store";
import { listMethodRules } from "@/server/research/method-rule-registry";
import { evaluateMethodRule } from "@/domain/research/evaluate-method-rule";
import { synthesizeValidationReports } from "@/domain/research/synthesize-validation-reports";
import { buildThesisSnapshot } from "@/domain/research/build-thesis-snapshot";
import type { ThesisArcSnapshot } from "@/domain/research/thesis-snapshot";
import type { SupplyChainGraph } from "@/domain/research/supply-chain-graph";
import type { AvailabilityEvidence, ResearchAvailability } from "@/domain/research/research-availability";
import type { ResearchEvidenceRecord } from "@/domain/research/research-evidence-record";
import { listResearchClaims } from "@/server/research/research-claim-store";
import { listResearchPosts } from "@/server/research/research-voice-store";
import { listEvidenceRecordsForAsset } from "@/server/research/research-evidence-store";
import { loadVersionedOhlcvHistory } from "../factors/ohlcv-history-loader";
import { resolveAppDate, resolveKnownAt } from "@/domain/research/resolve-evidence-quality";
import type { MarketUniverseId } from "@/domain/universe/market-universe";
import type { ResearchClaim } from "@/domain/research/research-claim";
import type { PublicResearchPost } from "@/domain/research/research-voice";

export type GetResearchDiagnosticDataInput = {
  assetId: string;
  asOfDate: string;
  universeId: string;
};

export type ResearchDiagnosticData = {
  thesisSnapshot: ThesisArcSnapshot;
  validationResult: any;
  evaluations: any[];
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
  const { assetId, asOfDate: rawAsOfDate, universeId } = input;

  // 1. Resolve date alignments
  const asOfDate = resolveAppDate(rawAsOfDate);
  const knownAt = resolveKnownAt(asOfDate);

  // Validate universe mapping matches asset market
  const isKrAsset = assetId.startsWith("KR_");
  const isUsAsset = assetId.startsWith("US_");
  const isKrUniverse = universeId === "KOSPI_SAMPLE" || universeId === "KOSPI";
  const isUsUniverse = universeId === "SP500_SAMPLE" || universeId === "SP500";

  if ((isKrAsset && !isKrUniverse) || (isUsAsset && !isUsUniverse) || (!isKrAsset && !isUsAsset)) {
    return {
      value: null,
      status: "insufficient_data",
      source: "research_workspace_service",
      sourceTier: "manual_import",
      warnings: ["unofficial"],
      updatedAt: new Date().toISOString(),
      message: `Universe ID "${universeId}" does not match the market region of asset ID "${assetId}".`,
    };
  }

  // 2. Fetch and filter posts / claims based on Point-In-Time (knownAt)
  const allPosts = await listResearchPosts();
  const allClaims = await listResearchClaims({ assetId });

  // Group posts by canonical ID
  const postsByCanonical: Record<string, PublicResearchPost[]> = {};
  for (const post of allPosts) {
    const canonicalId = post.revisionOf || post.postId;
    if (!postsByCanonical[canonicalId]) {
      postsByCanonical[canonicalId] = [];
    }
    postsByCanonical[canonicalId].push(post);
  }

  // Determine active version of each post at knownAt KST
  const activePostIds = new Set<string>();
  const voiceTimeline: PublicResearchPost[] = [];

  for (const canonicalId in postsByCanonical) {
    const versions = postsByCanonical[canonicalId];
    const validVersions = versions.filter(
      (v) => v.publishedAt <= knownAt && v.ingestedAt <= knownAt
    );
    if (validVersions.length === 0) continue;

    // Sort valid versions: newest revision first (publishedAt desc, ingestedAt desc)
    validVersions.sort((a, b) => {
      const cmp = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      if (cmp !== 0) return cmp;
      return new Date(b.ingestedAt).getTime() - new Date(a.ingestedAt).getTime();
    });

    const activeVersion = validVersions[0];
    if (activeVersion.status !== "deleted") {
      voiceTimeline.push(activeVersion);
      activePostIds.add(activeVersion.postId);
    }
  }

  // Filter claims: must belong to one of the active post versions (prohibits standalone claims)
  const claims = allClaims.filter((claim) => {
    if (!claim.postId) return false;
    return activePostIds.has(claim.postId);
  });

  // If no claims exist at this point in time, fail-fast
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

  // Fetch all evidence records for this asset
  const allEvidenceRecords = await listEvidenceRecordsForAsset(assetId);

  // 3. Resolve symbol details
  const symbolRecord = await getSymbolMasterRecord(assetId).catch(() => null);
  const market: "KR" | "US" = (symbolRecord?.market as "KR" | "US") ?? "KR";

  // 4. Resolve Availability categories independently
  // 4a. Price: load versioned OHLCV
  const ohlcvEnv = await loadVersionedOhlcvHistory({
    assetId,
    universeId: universeId as MarketUniverseId,
    asOfDate,
    knownAt,
  }).catch(() => null);

  const ohlcvRecords = ohlcvEnv?.value ?? null;
  const priceAvail: AvailabilityEvidence =
    ohlcvEnv && ohlcvEnv.value && ohlcvEnv.value.length > 0
      ? makeAvailable(
          ohlcvEnv.dataVersionId ? [ohlcvEnv.dataVersionId] : [],
          ohlcvEnv.updatedAt || new Date().toISOString(),
          asOfDate
        )
      : makeUnavailable("price_data_unavailable", asOfDate);

  // 4b. Valuation: unavailable
  const valuationAvail: AvailabilityEvidence = makeUnavailable("valuation_metrics_unavailable", asOfDate);

  // 4c. Filings: get actual filings with receiptNo
  const stockCode = assetId.startsWith("KR_")
    ? assetId.replace("KR_", "")
    : assetId.startsWith("US_")
    ? assetId.replace("US_", "")
    : null;

  const filingRecords = stockCode
    ? await getRecentFilings({ stockCode, limit: 5 }).catch(() => [])
    : [];

  // Filter filings available as of knownAt
  const validFilingRecords = filingRecords.filter(
    (f: any) => f.receiptNo && f.dataAvailableAt && f.dataAvailableAt <= knownAt
  );

  const filingsAvail: AvailabilityEvidence = validFilingRecords.length > 0
    ? makeAvailable(
        validFilingRecords.slice(0, 3).map((f: any) => f.receiptNo),
        validFilingRecords[0].dataAvailableAt || new Date().toISOString(),
        asOfDate
      )
    : makeUnavailable("filings_unavailable", asOfDate);

  // 4d. Supply Chain: unavailable
  const supplyChainAvail: AvailabilityEvidence = makeUnavailable("supply_chain_graph_unavailable", asOfDate);
  const supplyChainGraph: SupplyChainGraph | null = null;

  const availability: ResearchAvailability = {
    price: priceAvail,
    valuation: valuationAvail,
    filings: filingsAvail,
    supplyChain: supplyChainAvail,
  };

  // 5. Signal Version & Provenance metadata
  const signalVersion: SignalVersion | null = null;
  const dataVersionIds: string[] = (ohlcvEnv && ohlcvEnv.dataVersionId) ? [ohlcvEnv.dataVersionId] : [];

  // 6. Filter evidence records to only those verified, non-expired, and matching PIT
  const referencedEvidenceIds = new Set(claims.flatMap((c) => c.evidenceIds));
  const evidenceRecords = allEvidenceRecords.filter(
    (ev) =>
      referencedEvidenceIds.has(ev.evidenceId) &&
      ev.verificationStatus === "verified" &&
      ev.dataAvailableAt &&
      ev.dataAvailableAt <= knownAt
  );

  // 7. Gate check: if no verified evidence records are available, diagnostic fails-fast
  if (evidenceRecords.length === 0) {
    return {
      value: null,
      status: "insufficient_data",
      source: "research_workspace_service",
      sourceTier: "manual_import",
      warnings: ["unofficial"],
      updatedAt: new Date().toISOString(),
      message: "진단 가능한 실제 검증된 근거 기록이 존재하지 않습니다.",
    };
  }

  // 8. Evaluate all 11 method rules using verified PIT evidence records
  const rules = listMethodRules();
  const evaluations = rules.map((rule) =>
    evaluateMethodRule({
      rule,
      assetId,
      market,
      claims,
      evidenceRecords,
      asOfDate,
      knownAt,
      signalVersion,
    })
  );

  // 9. Synthesize validation reports
  const validationResult = synthesizeValidationReports({
    assetId,
    evaluations,
    availability,
    signalVersion,
    evidenceRecords,
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

  // Preserve source timestamps
  const timestamps = [
    ohlcvEnv?.updatedAt,
    validFilingRecords[0]?.dataAvailableAt,
    ...evidenceRecords.map((r) => r.retrievedAt),
  ].filter(Boolean) as string[];

  const maxTimestamp = timestamps.length
    ? timestamps.reduce((max, t) => (t > max ? t : max), timestamps[0])
    : new Date().toISOString();

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
    updatedAt: maxTimestamp,
  };
}
