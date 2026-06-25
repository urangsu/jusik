import { describe, it, expect } from "vitest";
import {
  mapIndividualSignalIcToFindings,
  mapFactorCorrelationToFindings,
  mapMarketExposureToFindings,
} from "./audit-finding-mapper";
import { IndividualSignalIcResult } from "@/domain/audit/individual-signal-ic-result";
import { FactorCorrelationResult } from "@/domain/audit/factor-correlation-result";
import { MarketExposureResult } from "@/domain/audit/market-exposure-result";

describe("Audit Finding Mapper", () => {
  describe("mapIndividualSignalIcToFindings", () => {
    it("should map warning and watch IC severities, and skip neutral ones with no warnings", () => {
      const mockResults: IndividualSignalIcResult[] = [
        {
          id: "ic-1",
          universeId: "KOSPI_SAMPLE",
          signalId: "sig-1",
          signalLabelKo: null,
          horizon: "forward_5d",
          sampleSize: 100,
          dateCount: 10,
          assetCount: 10,
          icPearson: 0.05,
          icSpearman: -0.09,
          meanForwardReturnTopQuantile: 0.02,
          meanForwardReturnBottomQuantile: -0.01,
          topBottomSpread: 0.03,
          severity: "strong_negative",
          warnings: ["negative_ic"],
          sourceTierSummary: "official",
          calculatedAt: "2026-06-25T12:00:00Z",
          engineVersion: "1.0.0",
        },
        {
          id: "ic-2",
          universeId: "KOSPI_SAMPLE",
          signalId: "sig-2",
          signalLabelKo: null,
          horizon: "forward_20d",
          sampleSize: 200,
          dateCount: 20,
          assetCount: 10,
          icPearson: 0.04,
          icSpearman: 0.05,
          meanForwardReturnTopQuantile: 0.03,
          meanForwardReturnBottomQuantile: 0.01,
          topBottomSpread: 0.02,
          severity: "weak_positive",
          warnings: [], // no triggers, should be skipped
          sourceTierSummary: "official",
          calculatedAt: "2026-06-25T12:00:00Z",
          engineVersion: "1.0.0",
        },
      ];

      const findings = mapIndividualSignalIcToFindings(mockResults);
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe("finding_ic_KOSPI_SAMPLE_sig-1_forward_5d");
      expect(findings[0].severity).toBe("warning");
      expect(findings[0].scope).toBe("signal");
      expect(findings[0].assetId).toBeNull();
    });
  });

  describe("mapFactorCorrelationToFindings", () => {
    it("should map warn and danger correlation results", () => {
      const mockResults: FactorCorrelationResult[] = [
        {
          id: "fc-1",
          universeId: "SP500_SAMPLE",
          factorA: "fact-A",
          factorB: "fact-B",
          method: "pearson",
          sampleSize: 100,
          dateCount: 10,
          assetCount: 10,
          correlation: 0.85,
          absCorrelation: 0.85,
          severity: "danger",
          warnings: ["very_high_correlation"],
          sourceTierSummary: "manual_import",
          calculatedAt: "2026-06-25T12:00:00Z",
          engineVersion: "1.0.0",
        },
        {
          id: "fc-2",
          universeId: "SP500_SAMPLE",
          factorA: "fact-C",
          factorB: "fact-D",
          method: "pearson",
          sampleSize: 100,
          dateCount: 10,
          assetCount: 10,
          correlation: 0.1,
          absCorrelation: 0.1,
          severity: "ok",
          warnings: [],
          sourceTierSummary: "official",
          calculatedAt: "2026-06-25T12:00:00Z",
          engineVersion: "1.0.0",
        },
      ];

      const findings = mapFactorCorrelationToFindings(mockResults);
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe("finding_corr_SP500_SAMPLE_fact-A_fact-B_pearson");
      expect(findings[0].severity).toBe("warning");
      expect(findings[0].actionability).toBe("manual_research_required");
      expect(findings[0].factorA).toBe("fact-A");
    });
  });

  describe("mapMarketExposureToFindings", () => {
    it("should map exposure warning assessments", () => {
      const mockResults: MarketExposureResult[] = [
        {
          id: "me-1",
          trialId: "trial-123",
          backtestRunId: "run-456",
          strategyId: "strat-1",
          universeId: "KOSPI_SAMPLE",
          benchmarkAssetId: "BM-1",
          sampleSize: 50,
          beta: 1.5,
          benchmarkCorrelation: 0.85,
          upMarketAvgReturn: 0.05,
          downMarketAvgReturn: -0.04,
          upCapture: 1.2,
          downCapture: 1.5,
          averageExcessReturn: 0.01,
          assessment: "market_dependent",
          warnings: ["high_beta", "high_benchmark_correlation"],
          calculatedAt: "2026-06-25T12:00:00Z",
          engineVersion: "1.0.0",
        },
      ];

      const findings = mapMarketExposureToFindings(mockResults);
      expect(findings).toHaveLength(1);
      expect(findings[0].id).toBe("finding_exposure_trial-123");
      expect(findings[0].severity).toBe("warning");
      expect(findings[0].universeId).toBe("KOSPI_SAMPLE");
      expect(findings[0].trialId).toBe("trial-123");
    });
  });
});
