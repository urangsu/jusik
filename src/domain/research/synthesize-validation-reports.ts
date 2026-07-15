import type { MethodRuleEvaluation } from "./method-evaluation";
import type { ResearchValidationReport, ResearchValidationSeatId } from "./research-validation";
import type { SignalVersion } from "@/domain/signals/signal-version";

export type SynthesizeValidationReportsInput = {
  assetId: string;
  evaluations: MethodRuleEvaluation[];
  priceAvailable: boolean;
  valuationAvailable: boolean;
  filingsAvailable: boolean;
  signalVersion: SignalVersion;
};

export type SynthesisResult = {
  reports: ResearchValidationReport[];
  globalStatus: "confirming" | "mixed" | "deteriorating" | "insufficient_data";
  isVetoed: boolean;
  vetoReasons: string[];
};

export function synthesizeValidationReports(input: SynthesizeValidationReportsInput): SynthesisResult {
  const { assetId, evaluations, priceAvailable, valuationAvailable, filingsAvailable, signalVersion } = input;

  const reports: ResearchValidationReport[] = [];
  const allVetoReasons: string[] = [];

  // Helper to extract claims and evidence from matching evaluations
  const extractRefs = (ruleIds: string[]) => {
    const matched = evaluations.filter((e) => ruleIds.includes(e.ruleId));
    return {
      claimIds: Array.from(new Set(matched.flatMap((m) => m.claimIds))),
      supportingEvidenceIds: Array.from(new Set(matched.flatMap((m) => m.supportingEvidenceIds))),
      contradictingEvidenceIds: Array.from(new Set(matched.flatMap((m) => m.contradictingEvidenceIds))),
      missingInputs: Array.from(new Set(matched.flatMap((m) => m.missingInputs))),
      staleEvidenceIds: Array.from(new Set(matched.flatMap((m) => m.staleEvidenceIds))),
      dataQualityScore: matched.length > 0
        ? matched.reduce((acc, curr) => acc + curr.dataQualityScore, 0) / matched.length
        : 0,
    };
  };

  // 1. Seat: evidence_counter_thesis (Counter Thesis Veto Gate)
  const contradictedEval = evaluations.find((e) => e.status === "contradicted");
  const counterRefs = extractRefs(evaluations.map(e => e.ruleId));
  const hasContradiction = !!contradictedEval;
  const counterStatus = hasContradiction ? "deteriorating" : "confirming";
  const counterVetos = hasContradiction ? [`Fatal evidence contradiction detected in rule "${contradictedEval.ruleId}".`] : [];
  if (hasContradiction) allVetoReasons.push(...counterVetos);

  reports.push({
    seatId: "evidence_counter_thesis",
    assetId,
    status: counterStatus,
    claimIds: counterRefs.claimIds,
    supportingEvidenceIds: counterRefs.supportingEvidenceIds,
    contradictingEvidenceIds: counterRefs.contradictingEvidenceIds,
    missingInputs: counterRefs.missingInputs,
    freshness: counterRefs.staleEvidenceIds.length > 0 ? "stale" : "fresh",
    confidence: counterRefs.supportingEvidenceIds.length > 3 ? "high" : counterRefs.supportingEvidenceIds.length > 0 ? "medium" : "low",
    abstained: false,
    vetoReasons: counterVetos,
    dataQualityScore: counterRefs.dataQualityScore,
    signalVersion,
  });

  // 2. Seat: demand_supply_chain
  const dscRefs = extractRefs(["demand_evidence", "supply_chain_bottleneck"]);
  const dscEvals = evaluations.filter((e) => ["demand_evidence", "supply_chain_bottleneck"].includes(e.ruleId));
  const dscHasContradiction = dscEvals.some((e) => e.status === "contradicted");
  const dscHasInsufficient = dscEvals.some((e) => e.status === "insufficient_data") || dscEvals.length === 0;
  const dscHasAllSupported = dscEvals.length > 0 && dscEvals.every((e) => e.status === "supported");

  let dscStatus: ResearchValidationReport["status"] = "mixed";
  if (dscHasContradiction) {
    dscStatus = "deteriorating";
  } else if (dscHasInsufficient) {
    dscStatus = "insufficient_data";
  } else if (dscHasAllSupported) {
    dscStatus = "confirming";
  }

  reports.push({
    seatId: "demand_supply_chain",
    assetId,
    status: dscStatus,
    claimIds: dscRefs.claimIds,
    supportingEvidenceIds: dscRefs.supportingEvidenceIds,
    contradictingEvidenceIds: dscRefs.contradictingEvidenceIds,
    missingInputs: dscRefs.missingInputs,
    freshness: dscRefs.staleEvidenceIds.length > 0 ? "stale" : "fresh",
    confidence: dscRefs.supportingEvidenceIds.length > 0 ? "medium" : "none",
    abstained: false,
    vetoReasons: [],
    dataQualityScore: dscRefs.dataQualityScore,
    signalVersion,
  });

  // 3. Seat: company_attribution
  // Veto rule: missing supply-chain evidence makes company attribution abstain
  const caAbstain = dscStatus === "insufficient_data";
  const caRefs = extractRefs(["customer_validation", "contract_counterparty_quality"]);
  const caEvals = evaluations.filter((e) => ["customer_validation", "contract_counterparty_quality"].includes(e.ruleId));
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

  reports.push({
    seatId: "company_attribution",
    assetId,
    status: caStatus,
    claimIds: caRefs.claimIds,
    supportingEvidenceIds: caRefs.supportingEvidenceIds,
    contradictingEvidenceIds: caRefs.contradictingEvidenceIds,
    missingInputs: caRefs.missingInputs,
    freshness: caRefs.staleEvidenceIds.length > 0 ? "stale" : "fresh",
    confidence: caAbstain ? "none" : caRefs.supportingEvidenceIds.length > 0 ? "medium" : "low",
    abstained: caAbstain,
    vetoReasons: caAbstain ? ["Abstained: Missing demand or supply chain path evidence."] : [],
    dataQualityScore: caRefs.dataQualityScore,
    signalVersion,
  });

  // 4. Seat: financial_quality
  const fqRefs = extractRefs(["gaap_financial_quality", "dilution_financing_risk"]);
  const fqEvals = evaluations.filter((e) => ["gaap_financial_quality", "dilution_financing_risk"].includes(e.ruleId));
  const fqHasContradiction = fqEvals.some((e) => e.status === "contradicted");
  const fqHasAllSupported = fqEvals.length > 0 && fqEvals.every((e) => e.status === "supported");

  let fqStatus: ResearchValidationReport["status"] = "mixed";
  const fqVetos: string[] = [];

  // Veto rule: missing fundamentals/filings prevents company confirming
  if (!filingsAvailable) {
    fqStatus = "insufficient_data";
    fqVetos.push("Missing core fundamentals or filings data.");
    allVetoReasons.push("Missing core fundamentals or filings data.");
  } else {
    if (fqHasContradiction) {
      fqStatus = "deteriorating";
    } else if (fqHasAllSupported) {
      fqStatus = "confirming";
    } else {
      fqStatus = "mixed";
    }
  }

  reports.push({
    seatId: "financial_quality",
    assetId,
    status: fqStatus,
    claimIds: fqRefs.claimIds,
    supportingEvidenceIds: fqRefs.supportingEvidenceIds,
    contradictingEvidenceIds: fqRefs.contradictingEvidenceIds,
    missingInputs: fqRefs.missingInputs,
    freshness: fqRefs.staleEvidenceIds.length > 0 ? "stale" : "fresh",
    confidence: fqRefs.supportingEvidenceIds.length > 0 ? "medium" : "none",
    abstained: false,
    vetoReasons: fqVetos,
    dataQualityScore: fqRefs.dataQualityScore,
    signalVersion,
  });

  // 5. Seat: security_market_window
  const smwRefs = extractRefs(["valuation_absorption", "market_window"]);
  const smwEvals = evaluations.filter((e) => ["valuation_absorption", "market_window"].includes(e.ruleId));
  const smwHasContradiction = smwEvals.some((e) => e.status === "contradicted");
  const smwHasAllSupported = smwEvals.length > 0 && smwEvals.every((e) => e.status === "supported");

  let smwStatus: ResearchValidationReport["status"] = "mixed";
  const smwVetos: string[] = [];

  // Veto rule: missing price or valuation makes it not decision-grade / insufficient
  if (!priceAvailable || !valuationAvailable) {
    smwStatus = "insufficient_data";
    const reason = "Missing current price or valuation metrics.";
    smwVetos.push(reason);
    allVetoReasons.push(reason);
  } else {
    if (smwHasContradiction) {
      smwStatus = "deteriorating";
    } else if (smwHasAllSupported) {
      smwStatus = "confirming";
    } else {
      smwStatus = "mixed";
    }
  }

  reports.push({
    seatId: "security_market_window",
    assetId,
    status: smwStatus,
    claimIds: smwRefs.claimIds,
    supportingEvidenceIds: smwRefs.supportingEvidenceIds,
    contradictingEvidenceIds: smwRefs.contradictingEvidenceIds,
    missingInputs: smwRefs.missingInputs,
    freshness: smwRefs.staleEvidenceIds.length > 0 ? "stale" : "fresh",
    confidence: smwRefs.supportingEvidenceIds.length > 0 ? "medium" : "none",
    abstained: false,
    vetoReasons: smwVetos,
    dataQualityScore: smwRefs.dataQualityScore,
    signalVersion,
  });

  // 6. Aggregate Global Status via Veto Chain
  // No majority voting exists. A single deteriorating seat cascades the global status.
  const isVetoed = allVetoReasons.length > 0 || reports.some((r) => r.status === "deteriorating");

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
