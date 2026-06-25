import { AiOutputIntent } from "@/domain/ai/structured-ai-output";
import { AuditFinding } from "@/domain/audit/audit-finding";

export type AiContextPack = {
  id: string;
  intent: AiOutputIntent;
  sourceRefs: {
    sourceType: string;
    sourceId: string;
    source: string;
    status: string;
    updatedAt: string | null;
    warnings: string[];
  }[];
  facts: {
    key: string;
    value: string | number | null;
    unit?: string;
  }[];
  limitations: string[];
  createdAt: string;
};

export function buildAuditFindingContextPack(finding: AuditFinding): AiContextPack {
  const sourceRefs = [
    {
      sourceType: finding.sourceType,
      sourceId: finding.sourceId,
      source: "audit_finding_store",
      status: "cached",
      updatedAt: finding.calculatedAt || finding.detectedAt || null,
      warnings: finding.warnings || [],
    },
  ];

  const facts: { key: string; value: string | number | null; unit?: string }[] = [
    { key: "severity", value: finding.severity },
    { key: "actionability", value: finding.actionability },
    { key: "scope", value: finding.scope },
  ];

  if (finding.assetId === null) {
    facts.push({ key: "asset_specific", value: "false" });
  } else {
    facts.push({ key: "asset_specific", value: "true" });
    facts.push({ key: "asset_id", value: finding.assetId });
  }

  if (finding.universeId) {
    facts.push({ key: "universe_id", value: finding.universeId });
  }
  if (finding.strategyId) {
    facts.push({ key: "strategy_id", value: finding.strategyId });
  }
  if (finding.trialId) {
    facts.push({ key: "trial_id", value: finding.trialId });
  }
  if (finding.signalId) {
    facts.push({ key: "signal_id", value: finding.signalId });
  }

  // Regex extractors from finding summary
  const summary = finding.summary || "";

  if (finding.sourceType === "individual_signal_ic") {
    const icMatch = summary.match(/Spearman IC ([\d.-]+)/);
    if (icMatch) {
      facts.push({ key: "ic_spearman", value: parseFloat(icMatch[1]) });
    }
    const sampleMatch = summary.match(/sample (\d+)/);
    if (sampleMatch) {
      facts.push({ key: "sample_size", value: parseInt(sampleMatch[1], 10) });
    }
    const spreadMatch = summary.match(/top-bottom spread ([\d.-]+%?)/);
    if (spreadMatch) {
      facts.push({ key: "top_bottom_spread", value: spreadMatch[1] });
    }
  } else if (finding.sourceType === "factor_correlation") {
    const corrMatch = summary.match(/상관계수 ([\d.-]+)/);
    if (corrMatch) {
      facts.push({ key: "correlation", value: parseFloat(corrMatch[1]) });
    }
    const sampleMatch = summary.match(/sample (\d+)/);
    if (sampleMatch) {
      facts.push({ key: "sample_size", value: parseInt(sampleMatch[1], 10) });
    }
    const methodMatch = summary.match(/^([A-Za-z]+)\s+상관계수/);
    if (methodMatch) {
      facts.push({ key: "correlation_method", value: methodMatch[1].toLowerCase() });
    }
  } else if (finding.sourceType === "market_exposure") {
    const betaMatch = summary.match(/beta ([\d.-]+)/);
    if (betaMatch) {
      facts.push({ key: "beta", value: parseFloat(betaMatch[1]) });
    }
    const benchmarkCorrMatch = summary.match(/benchmark correlation ([\d.-]+)/);
    if (benchmarkCorrMatch) {
      facts.push({ key: "benchmark_correlation", value: parseFloat(benchmarkCorrMatch[1]) });
    }
    const assessMatch = summary.match(/assessment (\w+)/);
    if (assessMatch) {
      facts.push({ key: "exposure_assessment", value: assessMatch[1] });
    }
  }

  // Limitations builder
  const limitations = ["이 정보는 과거 시점의 검증 데이터이며 실시간 시세 변동을 반영하지 않습니다."];
  if (finding.sourceType === "individual_signal_ic") {
    limitations.push("개별 신호의 과거 성과 데이터에 기반한 진단으로, 미래 성과를 보장하지 않습니다.");
  } else if (finding.sourceType === "factor_correlation") {
    limitations.push("선택된 샘플 유니버스 및 기간 동안의 상관관계 분석 결과이며, 다중공선성 진단 목적입니다.");
  } else if (finding.sourceType === "market_exposure") {
    limitations.push("특정 벤치마크 지수와의 단순 과거 민감도 분석이며, 시장 국면 변화에 따라 변동될 수 있습니다.");
  }

  if (finding.warnings && finding.warnings.length > 0) {
    limitations.push("경고 항목이 존재하므로 신뢰도 및 표본 데이터의 대표성을 재확인해야 합니다.");
  }

  return {
    id: finding.id,
    intent: "audit_finding_explanation",
    sourceRefs,
    facts,
    limitations,
    createdAt: new Date().toISOString(),
  };
}
