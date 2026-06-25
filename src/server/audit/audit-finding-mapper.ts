import { AuditFinding, AuditFindingSeverity, AuditFindingActionability } from "@/domain/audit/audit-finding";
import { IndividualSignalIcResult } from "@/domain/audit/individual-signal-ic-result";
import { FactorCorrelationResult } from "@/domain/audit/factor-correlation-result";
import { MarketExposureResult } from "@/domain/audit/market-exposure-result";

export function mapIndividualSignalIcToFindings(
  results: IndividualSignalIcResult[]
): AuditFinding[] {
  const filtered = results.filter((r) => {
    const hasBadSeverity = ["weak_negative", "strong_negative", "insufficient_sample", "not_available"].includes(r.severity);
    const hasBadWarnings = r.warnings.some((w) =>
      ["negative_ic", "near_zero_ic", "weak_signal_high_weight", "source_tier_mixed", "personal_fallback_used"].includes(w)
    );
    return hasBadSeverity || hasBadWarnings;
  });

  return filtered.map((r) => {
    let severity: AuditFindingSeverity = "watch";
    if (r.severity === "strong_negative" || r.severity === "not_available") {
      severity = "warning";
    }

    let actionability: AuditFindingActionability = "review_only";
    if (r.severity === "not_available") {
      actionability = "data_quality_check_required";
    }

    const icValStr = r.icSpearman !== null ? r.icSpearman.toFixed(4) : "null";
    const spreadValStr = r.topBottomSpread !== null ? (r.topBottomSpread * 100).toFixed(2) + "%" : "null";

    return {
      id: `finding_ic_${r.universeId}_${r.signalId}_${r.horizon}`,
      sourceType: "individual_signal_ic",
      sourceId: r.id,
      scope: "signal",
      assetId: null,
      symbol: null,
      universeId: r.universeId,
      strategyId: null,
      trialId: null,
      signalId: r.signalId,
      factorA: null,
      factorB: null,
      title: `개별 신호 IC 진단: ${r.signalId} / ${r.horizon}`,
      summary: `Spearman IC ${icValStr}, sample ${r.sampleSize}, top-bottom spread ${spreadValStr}. 샘플 유니버스 기준 진단 결과입니다.`,
      severity,
      actionability,
      warnings: [...r.warnings],
      sourceTier: r.sourceTierSummary || "unknown",
      sourceUrl: null,
      internalUrl: `/reliability?tab=signal_ic`,
      detectedAt: r.calculatedAt,
      calculatedAt: r.calculatedAt,
      engineVersion: r.engineVersion,
    };
  });
}

export function mapFactorCorrelationToFindings(
  results: FactorCorrelationResult[]
): AuditFinding[] {
  const filtered = results.filter((r) =>
    ["warn", "danger", "insufficient_sample", "not_available"].includes(r.severity)
  );

  return filtered.map((r) => {
    let severity: AuditFindingSeverity = "watch";
    if (r.severity === "danger") {
      severity = "warning";
    }

    let actionability: AuditFindingActionability = "review_only";
    if (r.severity === "danger") {
      actionability = "manual_research_required";
    }

    const corrValStr = r.correlation !== null ? r.correlation.toFixed(4) : "null";

    return {
      id: `finding_corr_${r.universeId}_${r.factorA}_${r.factorB}_${r.method}`,
      sourceType: "factor_correlation",
      sourceId: r.id,
      scope: "factor_pair",
      assetId: null,
      symbol: null,
      universeId: r.universeId,
      strategyId: null,
      trialId: null,
      signalId: null,
      factorA: r.factorA,
      factorB: r.factorB,
      title: `팩터 상관관계 진단: ${r.factorA} / ${r.factorB}`,
      summary: `${r.method.toUpperCase()} 상관계수 ${corrValStr}, sample ${r.sampleSize}. 중복도 검토용 진단 결과입니다.`,
      severity,
      actionability,
      warnings: [...r.warnings],
      sourceTier: r.sourceTierSummary || "unknown",
      sourceUrl: null,
      internalUrl: `/reliability?tab=correlation`,
      detectedAt: r.calculatedAt,
      calculatedAt: r.calculatedAt,
      engineVersion: r.engineVersion,
    };
  });
}

export function mapMarketExposureToFindings(
  results: MarketExposureResult[]
): AuditFinding[] {
  const filtered = results.filter((r) => {
    const hasBadAssessment = ["market_dependent", "partially_market_dependent", "insufficient_sample", "not_available"].includes(r.assessment);
    const hasBadWarnings = r.warnings.some((w) =>
      ["high_beta", "high_benchmark_correlation", "down_market_underperformance", "insufficient_benchmark_data"].includes(w)
    );
    return hasBadAssessment || hasBadWarnings;
  });

  return filtered.map((r) => {
    let severity: AuditFindingSeverity = "watch";
    if (r.assessment === "market_dependent" || r.assessment === "not_available") {
      severity = "warning";
    }

    let actionability: AuditFindingActionability = "review_only";
    if (r.assessment === "not_available") {
      actionability = "data_quality_check_required";
    }

    const betaValStr = r.beta !== null ? r.beta.toFixed(4) : "null";
    const corrValStr = r.benchmarkCorrelation !== null ? r.benchmarkCorrelation.toFixed(4) : "null";

    return {
      id: `finding_exposure_${r.trialId}`,
      sourceType: "market_exposure",
      sourceId: r.id,
      scope: "trial",
      assetId: null,
      symbol: null,
      universeId: r.universeId,
      strategyId: r.strategyId,
      trialId: r.trialId,
      signalId: null,
      factorA: null,
      factorB: null,
      title: `시장 노출도 진단: ${r.strategyId}`,
      summary: `beta ${betaValStr}, benchmark correlation ${corrValStr}, assessment ${r.assessment}. 전략의 시장 의존도 진단 결과입니다.`,
      severity,
      actionability,
      warnings: [...r.warnings],
      sourceTier: "manual_import",
      sourceUrl: null,
      internalUrl: `/backtest`,
      detectedAt: r.calculatedAt,
      calculatedAt: r.calculatedAt,
      engineVersion: r.engineVersion,
    };
  });
}
