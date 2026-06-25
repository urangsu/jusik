import { describe, it, expect } from "vitest";
import { buildAuditFindingContextPack } from "./ai-context-pack-builder";
import { AuditFinding } from "@/domain/audit/audit-finding";

describe("buildAuditFindingContextPack", () => {
  it("should generate correct context pack for individual signal IC finding", () => {
    const finding: AuditFinding = {
      id: "finding_ic_KOSPI_SAMPLE_momentum_v1_10d",
      sourceType: "individual_signal_ic",
      sourceId: "ic_1",
      scope: "signal",
      assetId: null,
      symbol: null,
      universeId: "KOSPI_SAMPLE",
      strategyId: null,
      trialId: null,
      signalId: "momentum_v1",
      factorA: null,
      factorB: null,
      title: "개별 신호 IC 진단",
      summary: "Spearman IC 0.1234, sample 500, top-bottom spread 4.50%. 샘플 유니버스 기준 진단 결과입니다.",
      severity: "watch",
      actionability: "review_only",
      warnings: ["negative_ic"],
      sourceTier: "manual_import",
      sourceUrl: null,
      internalUrl: null,
      detectedAt: "2026-06-25T12:00:00Z",
      calculatedAt: "2026-06-25T12:00:00Z",
      engineVersion: "1.0.0",
    };

    const res = buildAuditFindingContextPack(finding);
    expect(res.id).toBe(finding.id);
    expect(res.intent).toBe("audit_finding_explanation");
    expect(res.sourceRefs).toHaveLength(1);
    expect(res.sourceRefs[0].sourceType).toBe("individual_signal_ic");
    expect(res.sourceRefs[0].warnings).toContain("negative_ic");

    const assetSpecificFact = res.facts.find((f) => f.key === "asset_specific");
    expect(assetSpecificFact).toBeDefined();
    expect(assetSpecificFact?.value).toBe("false");

    const icFact = res.facts.find((f) => f.key === "ic_spearman");
    expect(icFact).toBeDefined();
    expect(icFact?.value).toBe(0.1234);

    const sampleFact = res.facts.find((f) => f.key === "sample_size");
    expect(sampleFact).toBeDefined();
    expect(sampleFact?.value).toBe(500);

    const spreadFact = res.facts.find((f) => f.key === "top_bottom_spread");
    expect(spreadFact).toBeDefined();
    expect(spreadFact?.value).toBe("4.50%");

    expect(res.limitations).toContain("개별 신호의 과거 성과 데이터에 기반한 진단으로, 미래 성과를 보장하지 않습니다.");
  });

  it("should generate correct context pack for factor correlation finding", () => {
    const finding: AuditFinding = {
      id: "finding_corr_KOSPI_SAMPLE_momentum_volatility_pearson",
      sourceType: "factor_correlation",
      sourceId: "corr_1",
      scope: "factor_pair",
      assetId: null,
      symbol: null,
      universeId: "KOSPI_SAMPLE",
      strategyId: null,
      trialId: null,
      signalId: null,
      factorA: "momentum",
      factorB: "volatility",
      title: "팩터 상관관계 진단",
      summary: "Pearson 상관계수 0.8540, sample 120. 중복도 검토용 진단 결과입니다.",
      severity: "warning",
      actionability: "manual_research_required",
      warnings: [],
      sourceTier: "manual_import",
      sourceUrl: null,
      internalUrl: null,
      detectedAt: "2026-06-25T12:00:00Z",
      calculatedAt: "2026-06-25T12:00:00Z",
      engineVersion: "1.0.0",
    };

    const res = buildAuditFindingContextPack(finding);
    const corrFact = res.facts.find((f) => f.key === "correlation");
    expect(corrFact).toBeDefined();
    expect(corrFact?.value).toBe(0.854);

    const methodFact = res.facts.find((f) => f.key === "correlation_method");
    expect(methodFact).toBeDefined();
    expect(methodFact?.value).toBe("pearson");

    expect(res.limitations).toContain("선택된 샘플 유니버스 및 기간 동안의 상관관계 분석 결과이며, 다중공선성 진단 목적입니다.");
  });

  it("should generate correct context pack for market exposure finding", () => {
    const finding: AuditFinding = {
      id: "finding_exposure_trial_123",
      sourceType: "market_exposure",
      sourceId: "exp_1",
      scope: "trial",
      assetId: "A005930",
      symbol: "삼성전자",
      universeId: null,
      strategyId: "strat_1",
      trialId: "trial_123",
      signalId: null,
      factorA: null,
      factorB: null,
      title: "시장 노출도 진단",
      summary: "beta 1.2500, benchmark correlation 0.7500, assessment market_dependent. 전략의 시장 의존도 진단 결과입니다.",
      severity: "watch",
      actionability: "review_only",
      warnings: ["high_beta"],
      sourceTier: "manual_import",
      sourceUrl: null,
      internalUrl: null,
      detectedAt: "2026-06-25T12:00:00Z",
      calculatedAt: "2026-06-25T12:00:00Z",
      engineVersion: "1.0.0",
    };

    const res = buildAuditFindingContextPack(finding);
    const assetSpecificFact = res.facts.find((f) => f.key === "asset_specific");
    expect(assetSpecificFact?.value).toBe("true");

    const assetIdFact = res.facts.find((f) => f.key === "asset_id");
    expect(assetIdFact?.value).toBe("A005930");

    const betaFact = res.facts.find((f) => f.key === "beta");
    expect(betaFact?.value).toBe(1.25);

    const benchmarkCorrFact = res.facts.find((f) => f.key === "benchmark_correlation");
    expect(benchmarkCorrFact?.value).toBe(0.75);

    const assessFact = res.facts.find((f) => f.key === "exposure_assessment");
    expect(assessFact?.value).toBe("market_dependent");

    expect(res.limitations).toContain("특정 벤치마크 지수와의 단순 과거 민감도 분석이며, 시장 국면 변화에 따라 변동될 수 있습니다.");
  });
});
