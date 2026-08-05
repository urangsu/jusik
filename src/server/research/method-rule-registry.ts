/**
 * Method Rule Registry.
 *
 * Contains research-only rule descriptions and input requirements.
 * Does NOT encode:
 * - Person-specific heuristics (e.g. fixed market cap thresholds, IV levels)
 * - Numeric weights
 * - Options selection logic
 * - Trading signals
 *
 * All rules have productionEligible: false. Production eligibility requires
 * K-Terminal's own out-of-sample validation.
 *
 * Veto severity mapping:
 * - fatal: core demand or financial integrity violation → isVetoed=true
 * - blocking: secondary structural or pricing violation → isVetoed=true
 * - warning: auxiliary indicator contradiction → deteriorating, NOT isVetoed
 * - none: informational only
 */

import type { ResearchMethodRule, ResearchMethodRuleId } from "@/domain/research/method-rule";

const ENGINE_VERSION = "0.1.0";

const REGISTRY: Record<ResearchMethodRuleId, ResearchMethodRule> = {
  demand_evidence: {
    ruleId: "demand_evidence",
    displayName: "수요 근거 (Demand Evidence)",
    description:
      "Verifies that documented, source-linked demand signals exist for the asset. " +
      "Self-reported or inferred demand does not satisfy this rule.",
    requiredInputKeys: ["demand_evidence"],
    requiredEvidenceKinds: ["revenue_data", "order_book", "customer_announcement"],
    confirmConditions: [
      "Official customer purchase order or contract announcement",
      "Revenue growth from named customer segments with filed data",
    ],
    warningConditions: [
      "Demand signals are mixed across customer segments",
      "Revenue data is more than one quarter old",
    ],
    breakConditions: [
      "Major customer cancellation confirmed by official filing",
      "Revenue decline confirmed in most recent quarter",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "fatal",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },

  supply_chain_bottleneck: {
    ruleId: "supply_chain_bottleneck",
    displayName: "공급망 병목 (Supply Chain Bottleneck)",
    description:
      "Identifies whether the asset occupies a verified bottleneck position in its supply chain. " +
      "Bottleneck status requires verified edges in the supply-chain graph.",
    requiredInputKeys: ["supply_chain_bottleneck"],
    requiredEvidenceKinds: ["supply_chain_filing", "industry_report"],
    confirmConditions: [
      "Asset is the sole or primary qualified supplier for a critical component",
      "Substitute path requires qualification cycles of 12+ months",
    ],
    warningConditions: [
      "Multiple qualified suppliers exist but capacity is constrained",
      "Bottleneck status is inferred, not verified",
    ],
    breakConditions: [
      "Alternative qualified supplier has entered volume production",
      "Customer has confirmed dual-sourcing strategy",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "blocking",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },

  substitutability: {
    ruleId: "substitutability",
    displayName: "대체 가능성 (Substitutability)",
    description:
      "Evaluates whether the asset's product or service can be readily substituted " +
      "by a competing solution within the relevant market window.",
    requiredInputKeys: ["substitutability"],
    requiredEvidenceKinds: ["competitive_analysis", "patent_filing"],
    confirmConditions: [
      "No qualified substitute exists within a 12-month window",
      "Patent moat confirmed by independent legal filing review",
    ],
    warningConditions: [
      "Competing products are in qualification phase",
      "Substitute technology exists but requires customer re-qualification",
    ],
    breakConditions: [
      "Drop-in substitute is in volume production with a key customer",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "warning",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },

  qualification_cycle: {
    ruleId: "qualification_cycle",
    displayName: "인증 주기 (Qualification Cycle)",
    description:
      "Tracks the qualification status of the asset's products with major customers. " +
      "Qualification data must be linked to official announcements or filings.",
    requiredInputKeys: ["qualification_cycle"],
    requiredEvidenceKinds: ["customer_announcement", "supply_chain_filing"],
    confirmConditions: [
      "Asset has completed qualification with Tier 1 customer",
      "Mass production ramp confirmed by official announcement",
    ],
    warningConditions: [
      "Qualification is ongoing with an estimated completion date",
    ],
    breakConditions: [
      "Qualification failure confirmed by customer or official source",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "blocking",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },

  capacity_elasticity: {
    ruleId: "capacity_elasticity",
    displayName: "생산능력 탄력성 (Capacity Elasticity)",
    description:
      "Assesses whether the asset has the capacity flexibility to meet incremental demand " +
      "without proportional cost increases.",
    requiredInputKeys: ["capacity_elasticity"],
    requiredEvidenceKinds: ["capex_filing", "industry_report"],
    confirmConditions: [
      "CapEx plan is sufficient to meet stated demand with filed evidence",
    ],
    warningConditions: [
      "Capacity expansion is in planning phase without confirmed CapEx",
    ],
    breakConditions: [
      "CapEx cancelled or deferred by official announcement",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "warning",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },

  customer_validation: {
    ruleId: "customer_validation",
    displayName: "고객 검증 (Customer Validation)",
    description:
      "Checks whether named customer relationships are validated by official sources, " +
      "not just inferred from public statements or mentions.",
    requiredInputKeys: ["customer_validation"],
    requiredEvidenceKinds: ["customer_announcement", "revenue_data"],
    confirmConditions: [
      "Named customer relationship confirmed in official filing or press release",
      "Revenue attribution to named customer is documented",
    ],
    warningConditions: [
      "Customer relationship is publicly acknowledged but revenue is not disclosed",
    ],
    breakConditions: [
      "Relationship termination confirmed by customer or filing",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "warning",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },

  contract_counterparty_quality: {
    ruleId: "contract_counterparty_quality",
    displayName: "계약 상대방 품질 (Contract Counterparty Quality)",
    description:
      "Evaluates the financial health and creditworthiness of the asset's key contract counterparties.",
    requiredInputKeys: ["contract_counterparty_quality"],
    requiredEvidenceKinds: ["credit_rating", "revenue_data"],
    confirmConditions: [
      "Counterparties are investment-grade rated or publicly listed with positive cash flow",
    ],
    warningConditions: [
      "Counterparty credit data is more than two quarters old",
    ],
    breakConditions: [
      "Major counterparty has filed for bankruptcy or credit downgrade confirmed",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "blocking",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },

  gaap_financial_quality: {
    ruleId: "gaap_financial_quality",
    displayName: "재무 건전성 (GAAP Financial Quality)",
    description:
      "Checks GAAP or K-IFRS financial quality indicators from filed statements. " +
      "Self-reported or adjusted metrics do not satisfy this rule.",
    requiredInputKeys: ["gaap_financial_quality"],
    requiredEvidenceKinds: ["filing_10k", "filing_dart"],
    confirmConditions: [
      "Positive operating cash flow from most recent annual filing",
      "Debt-to-equity ratio within sector-normal range per filed data",
    ],
    warningConditions: [
      "Operating cash flow is positive but declining over two consecutive quarters",
      "Most recent filing is more than six months old",
    ],
    breakConditions: [
      "Negative operating cash flow for two consecutive filed quarters",
      "Going-concern warning issued in most recent filing",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "fatal",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },

  dilution_financing_risk: {
    ruleId: "dilution_financing_risk",
    displayName: "희석/자금조달 위험 (Dilution & Financing Risk)",
    description:
      "Identifies dilution risk from share issuance, convertible debt, or secondary offerings " +
      "that are disclosed in official filings.",
    requiredInputKeys: ["dilution_financing_risk"],
    requiredEvidenceKinds: ["filing_10k", "filing_dart", "prospectus"],
    confirmConditions: [
      "No convertible debt or planned share issuance in most recent filing",
    ],
    warningConditions: [
      "Convertible debt exists but conversion price is significantly above market",
    ],
    breakConditions: [
      "Dilutive share issuance announced at a discount to market price",
      "Convertible debt approaching maturity with insufficient cash reserves",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "blocking",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },

  valuation_absorption: {
    ruleId: "valuation_absorption",
    displayName: "밸류에이션 흡수력 (Valuation Absorption)",
    description:
      "Evaluates whether the current market valuation can absorb expected fundamental improvements " +
      "based on filed financial data and current market price. " +
      "Requires current price data and at least one filed valuation metric.",
    requiredInputKeys: ["valuation_absorption"],
    requiredEvidenceKinds: ["market_price", "revenue_data"],
    confirmConditions: [
      "Price-to-sales or EV/Revenue is below the sector median with filed revenue data",
    ],
    warningConditions: [
      "Valuation is at or above sector median",
      "Market price data is more than one trading session old",
    ],
    breakConditions: [
      "Market price or valuation data is unavailable — security conclusion is not decision-grade",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "warning",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },

  market_window: {
    ruleId: "market_window",
    displayName: "시장 기회 (Market Window)",
    description:
      "Identifies whether a time-limited market opportunity is documented by official " +
      "industry data or regulatory announcements.",
    requiredInputKeys: ["market_window"],
    requiredEvidenceKinds: ["industry_report", "regulatory_filing"],
    confirmConditions: [
      "Market window is defined by a regulatory or policy event with a specific date",
      "Industry data supports that the window remains open",
    ],
    warningConditions: [
      "Market window is implied but not bounded by a specific date",
    ],
    breakConditions: [
      "Regulatory approval denied or policy event cancelled",
      "Market window officially closed by regulatory announcement",
    ],
    supportedMarkets: ["KR", "US"],
    vetoSeverity: "warning",
    productionEligible: false,
    engineVersion: ENGINE_VERSION,
  },
};

export function getMethodRule(ruleId: ResearchMethodRuleId): ResearchMethodRule {
  return REGISTRY[ruleId];
}

export function listMethodRules(): ResearchMethodRule[] {
  return Object.values(REGISTRY);
}

export function getMethodRuleIds(): ResearchMethodRuleId[] {
  return Object.keys(REGISTRY) as ResearchMethodRuleId[];
}
