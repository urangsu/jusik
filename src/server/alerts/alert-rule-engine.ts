import { AlertRule } from "@/domain/alerts/alert-rule";
import { JsonFileStore } from "../storage/json-file-store";

const DEFAULT_RULES: AlertRule[] = [
  {
    id: "preset-return-2s",
    name: "1일 수익률 ±2σ 초과",
    enabled: true,
    locale: "ko",
    type: "return_zscore",
    scope: "universe",
    target: { universeId: "KOSPI_SAMPLE" },
    condition: {
      kind: "return_zscore",
      returnWindow: "1D",
      baselineWindow: 60,
      thresholdAbsZ: 2.0,
      minAbsReturnPercent: 3.0,
      compareAgainst: "asset_history"
    },
    severity: "warning",
    channels: ["web_inbox", "console"],
    cooldownMinutes: 60,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: false,
      requireOfficialOrLicensed: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "preset-return-3pct",
    name: "1일 수익률 ±3% 초과",
    enabled: true,
    locale: "ko",
    type: "return_zscore",
    scope: "universe",
    target: { universeId: "KOSPI_SAMPLE" },
    condition: {
      kind: "return_zscore",
      returnWindow: "1D",
      baselineWindow: 60,
      thresholdAbsZ: 0.0,
      minAbsReturnPercent: 3.0,
      compareAgainst: "asset_history"
    },
    severity: "watch",
    channels: ["web_inbox", "console"],
    cooldownMinutes: 60,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: false,
      requireOfficialOrLicensed: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "preset-volume-2.5s",
    name: "거래량 60일 평균 대비 +2.5σ 초과",
    enabled: false,
    locale: "ko",
    type: "volume_zscore",
    scope: "universe",
    target: { universeId: "KOSPI_SAMPLE" },
    condition: {
      kind: "volume_zscore",
      baselineWindow: 60,
      thresholdZ: 2.5,
      minVolumeMultiplier: 2.0
    },
    severity: "watch",
    channels: ["web_inbox", "console"],
    cooldownMinutes: 60,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: false,
      requireOfficialOrLicensed: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "preset-gap-3pct",
    name: "갭 상승/하락 ±3% 초과",
    enabled: true,
    locale: "ko",
    type: "gap_move",
    scope: "universe",
    target: { universeId: "KOSPI_SAMPLE" },
    condition: {
      kind: "gap_move",
      thresholdPercent: 3.0,
      direction: "both"
    },
    severity: "watch",
    channels: ["web_inbox", "console"],
    cooldownMinutes: 30,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: false,
      requireOfficialOrLicensed: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "preset-provider-error",
    name: "API Provider Error",
    enabled: true,
    locale: "ko",
    type: "provider_error",
    scope: "provider",
    target: {},
    condition: {
      kind: "provider_error",
      providerIds: ["kis", "fmp_free", "alpha_vantage_free", "finnhub_free", "opendart", "sec_edgar"],
      statuses: ["error"]
    },
    severity: "warning",
    channels: ["web_inbox", "console"],
    cooldownMinutes: 120,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: true,
      requireOfficialOrLicensed: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "preset-rate-limited",
    name: "API Rate Limited",
    enabled: true,
    locale: "ko",
    type: "provider_error",
    scope: "provider",
    target: {},
    condition: {
      kind: "provider_error",
      providerIds: ["kis", "fmp_free", "alpha_vantage_free", "finnhub_free"],
      statuses: ["rate_limited"]
    },
    severity: "warning",
    channels: ["web_inbox", "console"],
    cooldownMinutes: 120,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: true,
      requireOfficialOrLicensed: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "preset-personal-fallback",
    name: "Personal Fallback 사용 알림",
    enabled: true,
    locale: "ko",
    type: "data_quality",
    scope: "market",
    target: {},
    condition: {
      kind: "provider_error",
      providerIds: ["yfinance_personal"],
      statuses: ["stale"]
    },
    severity: "info",
    channels: ["web_inbox", "console"],
    cooldownMinutes: 120,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: true,
      requireOfficialOrLicensed: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "preset-snapshot-failure",
    name: "Snapshot 생성 실패",
    enabled: true,
    locale: "ko",
    type: "data_quality",
    scope: "market",
    target: {},
    condition: {
      kind: "provider_error",
      providerIds: ["kis-snapshot-job", "yfinance_personal-worker"],
      statuses: ["error"]
    },
    severity: "critical",
    channels: ["web_inbox", "console"],
    cooldownMinutes: 120,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: true,
      requireOfficialOrLicensed: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "preset-strategy-eligible",
    name: "전략 점수 eligible 해제",
    enabled: false,
    locale: "ko",
    type: "strategy_score_change",
    scope: "universe",
    target: { universeId: "KOSPI_SAMPLE" },
    condition: {
      kind: "strategy_score_change",
      strategyIds: ["stddev-agreement"],
      minScore: 0
    },
    severity: "watch",
    channels: ["web_inbox", "console"],
    cooldownMinutes: 1440,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: false,
      requireOfficialOrLicensed: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "preset-new-filing",
    name: "신규 공시 알림 (Skeleton)",
    enabled: false,
    locale: "ko",
    type: "new_filing",
    scope: "universe",
    target: { universeId: "KOSPI_SAMPLE" },
    condition: {
      kind: "new_filing",
      keywords: ["합병", "증자", "감자", "배당", "공시"]
    },
    severity: "info",
    channels: ["web_inbox", "console"],
    cooldownMinutes: 0,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: true,
      requireOfficialOrLicensed: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export class AlertRuleEngine {
  private store: JsonFileStore<AlertRule[]>;

  constructor() {
    this.store = new JsonFileStore<AlertRule[]>("data/alerts/rules.json", []);
  }

  async getRules(): Promise<AlertRule[]> {
    const rules = await this.store.read();
    if (rules.length === 0) {
      await this.store.write(DEFAULT_RULES);
      return DEFAULT_RULES;
    }
    return rules;
  }

  async getRule(id: string): Promise<AlertRule | null> {
    const rules = await this.getRules();
    return rules.find(r => r.id === id) || null;
  }

  async createRule(rule: Omit<AlertRule, "id" | "createdAt" | "updatedAt">): Promise<AlertRule> {
    const rules = await this.getRules();
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    rules.push(newRule);
    await this.store.write(rules);
    return newRule;
  }

  async updateRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const rules = await this.getRules();
    const index = rules.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Rule ${id} not found`);
    }
    const updatedRule: AlertRule = {
      ...rules[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    rules[index] = updatedRule;
    await this.store.write(rules);
    return updatedRule;
  }

  async deleteRule(id: string): Promise<void> {
    const rules = await this.getRules();
    const filtered = rules.filter(r => r.id !== id);
    await this.store.write(filtered);
  }
}

export const alertRuleEngine = new AlertRuleEngine();
