import type { MethodRuleEvaluation } from "./method-evaluation";
import type { ResearchValidationReport, ResearchValidationSeatId, ResearchVetoReason } from "./research-validation";
import type { ResearchAvailability } from "./research-availability";
import { resolveEvidenceFreshness, resolveEvidenceConfidence } from "./resolve-evidence-quality";
import { getMethodRule } from "@/server/research/method-rule-registry";
import type { SignalVersion } from "@/domain/signals/signal-version";
import type { ResearchEvidenceRecord } from "@/domain/research/research-evidence-record";

export type SynthesizeValidationReportsInput = {
  assetId: string;
  evaluations: MethodRuleEvaluation[];
  availability: ResearchAvailability;
  signalVersion: SignalVersion | null;
  evidenceRecords: ResearchEvidenceRecord[];
};

export type SynthesisResult = {
  reports: ResearchValidationReport[];
  globalStatus: "confirming" | "mixed" | "deteriorating" | "insufficient_data";
  /**
   * True only when at least one ResearchVetoReason with severity "blocking" or "fatal" exists.
   * deteriorating status alone does NOT set isVetoed=true.
   */
  isVetoed: boolean;
  /** Always non-empty when isVetoed=true. Empty when isVetoed=false. */
  vetoReasons: ResearchVetoReason[];
};

// Helper to extract combined refs from evaluations matching given rule IDs
function extractRefs(evaluations: MethodRuleEvaluation[], ruleIds: string[]) {
  const matched = evaluations.filter((e) => ruleIds.includes(e.ruleId));
  return {
    claimIds: Array.from(new Set(matched.flatMap((m) => m.claimIds))),
    supportingEvidenceIds: Array.from(new Set(matched.flatMap((m) => m.supportingEvidenceIds))),
    contradictingEvidenceIds: Array.from(new Set(matched.flatMap((m) => m.contradictingEvidenceIds))),
    missingInputs: Array.from(new Set(matched.flatMap((m) => m.missingInputs))),
    staleEvidenceIds: Array.from(new Set(matched.flatMap((m) => m.staleEvidenceIds))),
    dataQualityScore:
      matched.length > 0
        ? matched.reduce((acc, curr) => acc + curr.dataQualityScore, 0) / matched.length
        : 0,
  };
}

export function synthesizeValidationReports(input: SynthesizeValidationReportsInput): SynthesisResult {
  const { assetId, evaluations, availability, signalVersion, evidenceRecords } = input;

  const reports: ResearchValidationReport[] = [];
  const allVetoReasons: ResearchVetoReason[] = [];

  // ── Seat 1: evidence_counter_thesis ──────────────────────────────────────
  const counterRefs = extractRefs(evaluations, evaluations.map((e) => e.ruleId));
  const counterVetos: ResearchVetoReason[] = [];

  // Find contradicted rules and check their severity
  const contradictedEvals = evaluations.filter((e) => e.status === "contradicted");
  for (const eval_ of contradictedEvals) {
    const rule = (() => { try { return getMethodRule(eval_.ruleId as any); } catch { return null; } })();
    if (!rule) continue;
    const severity = rule.vetoSeverity;
    if (severity === "blocking" || severity === "fatal") {
      counterVetos.push({
        code: `CONTRADICTION_${eval_.ruleId.toUpperCase()}`,
        severity: severity as "blocking" | "fatal",
        seatId: "evidence_counter_thesis",
        ruleId: eval_.ruleId,
        message: `Evidence contradiction detected in rule "${rule.displayName}". This is a ${severity} violation.`,
        evidenceIds: eval_.contradictingEvidenceIds,
      });
    }
  }

  if (counterVetos.length > 0) allVetoReasons.push(...counterVetos);

  const counterStatus: ResearchValidationReport["status"] =
    contradictedEvals.length > 0 ? "deteriorating" : "confirming";

  const counterFreshness = resolveEvidenceFreshness(counterRefs.supportingEvidenceIds, counterRefs.staleEvidenceIds);
  const counterConfidence = resolveEvidenceConfidence({
    supportingRecords: evidenceRecords.filter((r) => counterRefs.supportingEvidenceIds.includes(r.evidenceId)),
    contradictingRecords: evidenceRecords.filter((r) => counterRefs.contradictingEvidenceIds.includes(r.evidenceId)),
    freshness: counterFreshness,
  });

  reports.push({
    seatId: "evidence_counter_thesis",
    assetId,
    status: counterStatus,
    claimIds: counterRefs.claimIds,
    supportingEvidenceIds: counterRefs.supportingEvidenceIds,
    contradictingEvidenceIds: counterRefs.contradictingEvidenceIds,
    missingInputs: counterRefs.missingInputs,
    freshness: counterFreshness,
    confidence: counterConfidence,
    abstained: false,
    vetoReasons: counterVetos,
    dataQualityScore: counterRefs.dataQualityScore,
    signalVersion,
  });

  // ── Seat 2: demand_supply_chain ───────────────────────────────────────────
  const dscRuleIds = ["demand_evidence", "supply_chain_bottleneck"];
  const dscRefs = extractRefs(evaluations, dscRuleIds);
  const dscEvals = evaluations.filter((e) => dscRuleIds.includes(e.ruleId));
  const dscHasContradiction = dscEvals.some((e) => e.status === "contradicted");
  const dscHasInsufficient = dscEvals.length === 0 || dscEvals.some((e) => e.status === "insufficient_data");
  const dscHasAllSupported = dscEvals.length > 0 && dscEvals.every((e) => e.status === "supported");

  // Also check availability — missing supply chain graph is insufficient_data
  const supplyChainUnavailable = !availability.supplyChain.available;

  let dscStatus: ResearchValidationReport["status"] = "mixed";
  if (dscHasContradiction) {
    dscStatus = "deteriorating";
  } else if (dscHasInsufficient || supplyChainUnavailable) {
    dscStatus = "insufficient_data";
  } else if (dscHasAllSupported) {
    dscStatus = "confirming";
  }

  const dscMissingInputs = [...dscRefs.missingInputs];
  if (supplyChainUnavailable) {
    dscMissingInputs.push("supply_chain_graph_unavailable");
  }

  const dscFreshness = resolveEvidenceFreshness(dscRefs.supportingEvidenceIds, dscRefs.staleEvidenceIds);
  const dscConfidence = resolveEvidenceConfidence({
    supportingRecords: evidenceRecords.filter((r) => dscRefs.supportingEvidenceIds.includes(r.evidenceId)),
    contradictingRecords: evidenceRecords.filter((r) => dscRefs.contradictingEvidenceIds.includes(r.evidenceId)),
    freshness: dscFreshness,
  });

  reports.push({
    seatId: "demand_supply_chain",
    assetId,
    status: dscStatus,
    claimIds: dscRefs.claimIds,
    supportingEvidenceIds: dscRefs.supportingEvidenceIds,
    contradictingEvidenceIds: dscRefs.contradictingEvidenceIds,
    missingInputs: dscMissingInputs,
    freshness: dscFreshness,
    confidence: dscConfidence,
    abstained: false,
    vetoReasons: [],
    dataQualityScore: dscRefs.dataQualityScore,
    signalVersion,
  });

  // ── Seat 3: company_attribution ───────────────────────────────────────────
  const caAbstain = dscStatus === "insufficient_data";
  const caRuleIds = ["customer_validation", "contract_counterparty_quality"];
  const caRefs = extractRefs(evaluations, caRuleIds);
  const caEvals = evaluations.filter((e) => caRuleIds.includes(e.ruleId));
  const caHasContradiction = caEvals.some((e) => e.status === "contradicted");
  const caHasAllSupported = caEvals.length > 0 && caEvals.every((e) => e.status === "supported");

  let caStatus: ResearchValidationReport["status"] = "insufficient_data";
  if (!caAbstain) {
    if (caHasContradiction) {
      caStatus = "deteriorating";
    } else if (caHasAllSupported) {
      caStatus = "confirming";
    } else {
      caStatus = "mixed";
    }
  }

  const caMissingInputs = caAbstain ? ["supply_chain_graph_unavailable"] : caRefs.missingInputs;

  const caFreshness = caAbstain
    ? "unknown"
    : resolveEvidenceFreshness(caRefs.supportingEvidenceIds, caRefs.staleEvidenceIds);
  const caConfidence = caAbstain
    ? "none"
    : resolveEvidenceConfidence({
        supportingRecords: evidenceRecords.filter((r) => caRefs.supportingEvidenceIds.includes(r.evidenceId)),
        contradictingRecords: evidenceRecords.filter((r) => caRefs.contradictingEvidenceIds.includes(r.evidenceId)),
        freshness: caFreshness,
      });

  reports.push({
    seatId: "company_attribution",
    assetId,
    status: caStatus,
    claimIds: caRefs.claimIds,
    supportingEvidenceIds: caRefs.supportingEvidenceIds,
    contradictingEvidenceIds: caRefs.contradictingEvidenceIds,
    missingInputs: caMissingInputs,
    freshness: caFreshness,
    confidence: caConfidence,
    abstained: caAbstain,
    vetoReasons: [],
    dataQualityScore: caRefs.dataQualityScore,
    signalVersion,
  });

  // ── Seat 4: financial_quality ─────────────────────────────────────────────
  const fqRuleIds = ["gaap_financial_quality", "dilution_financing_risk"];
  const fqRefs = extractRefs(evaluations, fqRuleIds);
  const fqEvals = evaluations.filter((e) => fqRuleIds.includes(e.ruleId));
  const fqHasContradiction = fqEvals.some((e) => e.status === "contradicted");
  const fqHasAllSupported = fqEvals.length > 0 && fqEvals.every((e) => e.status === "supported");

  const filingsUnavailable = !availability.filings.available;

  let fqStatus: ResearchValidationReport["status"] = "mixed";
  const fqVetos: ResearchVetoReason[] = [];

  if (filingsUnavailable) {
    fqStatus = "insufficient_data";
  } else if (fqHasContradiction) {
    fqStatus = "deteriorating";
    const contradictedFqEvals = fqEvals.filter((e) => e.status === "contradicted");
    for (const eval_ of contradictedFqEvals) {
      const rule = (() => { try { return getMethodRule(eval_.ruleId as any); } catch { return null; } })();
      if (!rule) continue;
      if (rule.vetoSeverity === "blocking" || rule.vetoSeverity === "fatal") {
        const vetoReason: ResearchVetoReason = {
          code: `FINANCIAL_QUALITY_VIOLATION_${eval_.ruleId.toUpperCase()}`,
          severity: rule.vetoSeverity as "blocking" | "fatal",
          seatId: "financial_quality",
          ruleId: eval_.ruleId,
          message: `Financial quality violation detected in rule "${rule.displayName}".`,
          evidenceIds: eval_.contradictingEvidenceIds,
        };
        fqVetos.push(vetoReason);
        allVetoReasons.push(vetoReason);
      }
    }
  } else if (fqHasAllSupported) {
    fqStatus = "confirming";
  }

  const fqMissingInputs = [...fqRefs.missingInputs];
  if (filingsUnavailable) fqMissingInputs.push("filings_unavailable");

  const fqFreshness = resolveEvidenceFreshness(fqRefs.supportingEvidenceIds, fqRefs.staleEvidenceIds);
  const fqConfidence = resolveEvidenceConfidence({
    supportingRecords: evidenceRecords.filter((r) => fqRefs.supportingEvidenceIds.includes(r.evidenceId)),
    contradictingRecords: evidenceRecords.filter((r) => fqRefs.contradictingEvidenceIds.includes(r.evidenceId)),
    freshness: fqFreshness,
  });

  reports.push({
    seatId: "financial_quality",
    assetId,
    status: fqStatus,
    claimIds: fqRefs.claimIds,
    supportingEvidenceIds: fqRefs.supportingEvidenceIds,
    contradictingEvidenceIds: fqRefs.contradictingEvidenceIds,
    missingInputs: fqMissingInputs,
    freshness: fqFreshness,
    confidence: fqConfidence,
    abstained: false,
    vetoReasons: fqVetos,
    dataQualityScore: fqRefs.dataQualityScore,
    signalVersion,
  });

  // ── Seat 5: security_market_window ────────────────────────────────────────
  const smwRuleIds = ["valuation_absorption", "market_window"];
  const smwRefs = extractRefs(evaluations, smwRuleIds);
  const smwEvals = evaluations.filter((e) => smwRuleIds.includes(e.ruleId));
  const smwHasContradiction = smwEvals.some((e) => e.status === "contradicted");
  const smwHasAllSupported = smwEvals.length > 0 && smwEvals.every((e) => e.status === "supported");

  const priceUnavailable = !availability.price.available;
  const valuationUnavailable = !availability.valuation.available;

  let smwStatus: ResearchValidationReport["status"] = "mixed";
  const smwVetos: ResearchVetoReason[] = [];

  if (priceUnavailable || valuationUnavailable) {
    smwStatus = "insufficient_data";
  } else if (smwHasContradiction) {
    smwStatus = "deteriorating";
  } else if (smwHasAllSupported) {
    smwStatus = "confirming";
  }

  const smwMissingInputs = [...smwRefs.missingInputs];
  if (priceUnavailable) smwMissingInputs.push("price_data_unavailable");
  if (valuationUnavailable) smwMissingInputs.push("valuation_metrics_unavailable");

  const smwFreshness = resolveEvidenceFreshness(smwRefs.supportingEvidenceIds, smwRefs.staleEvidenceIds);
  const smwConfidence = resolveEvidenceConfidence({
    supportingRecords: evidenceRecords.filter((r) => smwRefs.supportingEvidenceIds.includes(r.evidenceId)),
    contradictingRecords: evidenceRecords.filter((r) => smwRefs.contradictingEvidenceIds.includes(r.evidenceId)),
    freshness: smwFreshness,
  });

  reports.push({
    seatId: "security_market_window",
    assetId,
    status: smwStatus,
    claimIds: smwRefs.claimIds,
    supportingEvidenceIds: smwRefs.supportingEvidenceIds,
    contradictingEvidenceIds: smwRefs.contradictingEvidenceIds,
    missingInputs: smwMissingInputs,
    freshness: smwFreshness,
    confidence: smwConfidence,
    abstained: false,
    vetoReasons: smwVetos,
    dataQualityScore: smwRefs.dataQualityScore,
    signalVersion,
  });

  // ── Aggregate global status (veto-first, no majority voting) ─────────────
  const isVetoed = allVetoReasons.some(
    (r) => r.severity === "blocking" || r.severity === "fatal"
  );

  let globalStatus: SynthesisResult["globalStatus"] = "confirming";
  if (reports.some((r) => r.status === "deteriorating")) {
    globalStatus = "deteriorating";
  } else if (reports.some((r) => r.status === "insufficient_data" && !r.abstained)) {
    globalStatus = "insufficient_data";
  } else if (reports.some((r) => r.status === "mixed")) {
    globalStatus = "mixed";
  }

  return {
    reports,
    globalStatus,
    isVetoed,
    vetoReasons: allVetoReasons,
  };
}
