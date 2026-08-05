import { describe, it, expect } from "vitest";
import { getMethodRule, listMethodRules, getMethodRuleIds } from "./method-rule-registry";
import type { ResearchMethodRuleId } from "@/domain/research/method-rule";

const ALL_RULE_IDS: ResearchMethodRuleId[] = [
  "demand_evidence",
  "supply_chain_bottleneck",
  "substitutability",
  "qualification_cycle",
  "capacity_elasticity",
  "customer_validation",
  "contract_counterparty_quality",
  "gaap_financial_quality",
  "dilution_financing_risk",
  "valuation_absorption",
  "market_window",
];

describe("method-rule-registry", () => {
  it("registry contains all 11 required rule IDs", () => {
    const ids = getMethodRuleIds();
    expect(ids).toHaveLength(11);
    for (const id of ALL_RULE_IDS) {
      expect(ids).toContain(id);
    }
  });

  it("every registry rule has productionEligible: false", () => {
    const rules = listMethodRules();
    for (const rule of rules) {
      expect(rule.productionEligible).toBe(false);
    }
  });

  it("every rule has non-empty requiredInputKeys", () => {
    const rules = listMethodRules();
    for (const rule of rules) {
      expect(rule.requiredInputKeys.length).toBeGreaterThan(0);
    }
  });

  it("every rule has at least one confirmCondition, warningCondition, and breakCondition", () => {
    const rules = listMethodRules();
    for (const rule of rules) {
      expect(rule.confirmConditions.length).toBeGreaterThan(0);
      expect(rule.warningConditions.length).toBeGreaterThan(0);
      expect(rule.breakConditions.length).toBeGreaterThan(0);
    }
  });

  it("every rule has a displayName and description", () => {
    const rules = listMethodRules();
    for (const rule of rules) {
      expect(rule.displayName.length).toBeGreaterThan(0);
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });

  it("every rule supports at least one market", () => {
    const rules = listMethodRules();
    for (const rule of rules) {
      expect(rule.supportedMarkets.length).toBeGreaterThan(0);
    }
  });

  it("getMethodRule returns the correct rule by ID", () => {
    const rule = getMethodRule("demand_evidence");
    expect(rule.ruleId).toBe("demand_evidence");
    expect(rule.productionEligible).toBe(false);
  });

  it("rules do not contain persona-specific numeric thresholds in descriptions", () => {
    const rules = listMethodRules();
    // The registry should not encode fixed thresholds like "$3B market cap" or "30 delta"
    for (const rule of rules) {
      expect(rule.description).not.toMatch(/\$\d+[BMK]/);
      expect(rule.description).not.toMatch(/delta/i);
      expect(rule.description).not.toMatch(/implied volatility/i);
    }
  });
});
