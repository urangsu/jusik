import { describe, it, expect } from "vitest";
import { checkBiasWarnings } from "@/server/strategy/strategy-bias-checker";
import { StrategyTrialRecord } from "@/domain/strategy/strategy-trial-record";

function makeTrial(overrides: Partial<StrategyTrialRecord> = {}): StrategyTrialRecord {
  const now = new Date().toISOString();
  return {
    id: "test_id",
    strategyId: "strategy_a",
    variantId: "v1",
    strategyFamily: "momentum",
    thesisKo: "테스트",
    hypothesis: "가설",
    parameters: {},
    parameterHash: "abc",
    universeId: "KOSPI_SAMPLE",
    dataWindow: { startDate: "2022-01-01", endDate: "2024-12-31" },
    backtestRunId: null,
    observedMetrics: {
      oosReturn: null,
      sharpe: null,
      maxDrawdown: null,
      spearmanIc: null,
      icir: null,
      hitRate: null,
      turnover: null,
    },
    validationStatus: "draft",
    rejectionReason: null,
    biasWarnings: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("StrategyBiasChecker", () => {
  it("should always add sample_universe_only warning", () => {
    const trial = makeTrial();
    const warnings = checkBiasWarnings(trial, []);
    expect(warnings).toContain("sample_universe_only");
  });

  it("should add data_snooping_possible when 5 or more variants exist", () => {
    const existing = Array.from({ length: 4 }, (_, i) =>
      makeTrial({ id: `t${i}`, variantId: `v${i}` })
    );
    const trial = makeTrial({ variantId: "v_new" });
    // existing.length + 1 = 5 → triggers warning
    const warnings = checkBiasWarnings(trial, existing);
    expect(warnings).toContain("data_snooping_possible");
  });

  it("should not add data_snooping_possible when fewer than 5 variants", () => {
    const existing = [makeTrial({ id: "t1", variantId: "v1" })];
    const trial = makeTrial({ variantId: "v2" });
    const warnings = checkBiasWarnings(trial, existing);
    expect(warnings).not.toContain("data_snooping_possible");
  });

  it("should add insufficient_oos_period when data window is too short", () => {
    const trial = makeTrial({
      dataWindow: { startDate: "2024-01-01", endDate: "2024-03-01" }, // < 6 months
    });
    const warnings = checkBiasWarnings(trial, []);
    expect(warnings).toContain("insufficient_oos_period");
  });

  it("should not add insufficient_oos_period when data window is sufficient", () => {
    const trial = makeTrial({
      dataWindow: { startDate: "2022-01-01", endDate: "2024-12-31" }, // > 18 months
    });
    const warnings = checkBiasWarnings(trial, []);
    expect(warnings).not.toContain("insufficient_oos_period");
  });

  it("should add insufficient_oos_period for sample universe", () => {
    const trial = makeTrial({
      dataWindow: { startDate: "2024-01-01", endDate: "2024-04-01" },
      universeId: "SP500_SAMPLE",
    });
    const warnings = checkBiasWarnings(trial, []);
    expect(warnings).toContain("insufficient_oos_period");
    expect(warnings).toContain("sample_universe_only");
  });
});
