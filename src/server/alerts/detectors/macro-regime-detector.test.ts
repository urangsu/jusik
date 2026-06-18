import { describe, expect, it, vi, beforeEach } from "vitest";
import { detectMacroRegimeAlerts } from "./macro-regime-detector";
import { regimeStore } from "../../regime/regime-store";
import { sentimentReferenceStore } from "../../sentiment/sentiment-reference-store";

vi.mock("../../regime/regime-store", () => ({
  regimeStore: {
    getAllLatest: vi.fn(),
    getHistory: vi.fn(),
  },
}));

vi.mock("../../sentiment/sentiment-reference-store", () => ({
  sentimentReferenceStore: {
    getLatestSnapshot: vi.fn(),
  },
}));

describe("detectMacroRegimeAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects regime changes and warns properly without investment advice", async () => {
    // Current regime is US: risk_off
    vi.mocked(regimeStore.getAllLatest).mockResolvedValue({
      US: {
        market: "US",
        regime: "risk_off",
        score: 38,
        confidence: "high",
        warnings: ["High VIX"],
        calculatedAt: "2026-06-18T10:00:00Z",
        dataStatus: "real_time",
      } as any,
    });

    // History had US: neutral
    vi.mocked(regimeStore.getHistory).mockResolvedValue([
      {
        market: "US",
        regime: "neutral",
        score: 52,
        calculatedAt: "2026-06-18T09:00:00Z",
      } as any,
    ]);

    vi.mocked(sentimentReferenceStore.getLatestSnapshot).mockResolvedValue(null);

    const alerts = await detectMacroRegimeAlerts();

    // Should detect regime change (neutral -> risk_off) AND current risk_off state
    expect(alerts.length).toBe(2);
    expect(alerts.map((a) => a.ruleType)).toContain("macro_regime_change");
    expect(alerts.map((a) => a.ruleType)).toContain("macro_risk_off");

    // Wording compliance test: message must not contain buy/sell/recommendation/opportunity keywords
    const forbiddenWords = ["매수", "매도", "추천", "기회", "buy", "sell", "opportunity"];
    for (const alert of alerts) {
      for (const word of forbiddenWords) {
        expect(alert.messageKo.toLowerCase()).not.toContain(word);
        expect(alert.messageEn.toLowerCase()).not.toContain(word);
      }
    }
  });

  it("detects cnn extreme fear and greed levels", async () => {
    vi.mocked(regimeStore.getAllLatest).mockResolvedValue({});
    vi.mocked(regimeStore.getHistory).mockResolvedValue([]);

    vi.mocked(sentimentReferenceStore.getLatestSnapshot).mockResolvedValue({
      market: "us_stock",
      provider: "cnn_fear_greed_reference",
      value: 12, // Extreme Fear
      label: "extreme_fear",
      updatedAt: "2026-06-18T10:00:00Z",
    } as any);

    const alerts = await detectMacroRegimeAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].ruleType).toBe("sentiment_extreme_fear");
    expect(alerts[0].severity).toBe("info"); // Must be info or lower
    expect(alerts[0].messageKo).toContain("전략 적합도 계산에는 사용되지 않습니다.");
  });
});
