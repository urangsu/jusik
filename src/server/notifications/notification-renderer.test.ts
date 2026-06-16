import { describe, it, expect } from "vitest";
import { alertEvaluator } from "../alerts/alert-evaluator";
import { AlertRule } from "@/domain/alerts/alert-rule";

describe("Notification Wording/Translation checks", () => {
  const ruleTemplate: AlertRule = {
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
    },
    severity: "warning",
    channels: ["web_inbox"],
    cooldownMinutes: 60,
    dataPolicy: {
      allowStale: true,
      allowDelayed: true,
      allowPersonalFallback: false,
      requireOfficialOrLicensed: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const target = {
    assetId: "KR:005930",
    symbol: "005930",
    region: "KR" as const,
    nameKo: "삼성전자",
    nameEn: "Samsung Electronics",
  };

  it("should not contain raw English words (Price, Volume, Warning, etc.) in Korean alert rendering", () => {
    // Generate return zscore event
    const volResult = {
      triggered: true,
      zScore: 2.4,
      returnPercent: 4.5,
      meanPercent: 0.1,
      stdPercent: 1.8,
      source: "KIS Open API",
      sourceTier: "official",
      dataStatus: "real_time",
      warnings: [],
    };

    const event = (alertEvaluator as any).createAssetEvent(ruleTemplate, target, volResult);

    expect(event.title).toContain("이상 등락 감지");
    expect(event.body).toContain("변동성");
    expect(event.body).toContain("표준편차");
    expect(event.body).toContain("출처");

    // Check blacklist words
    const blacklist = ["Price", "Volume", "Warning", "Provider", "Source", "Timestamp"];
    blacklist.forEach((word) => {
      const match = new RegExp(`\\b${word}\\b`, "i").test(event.body) ||
                    new RegExp(`\\b${word}\\b`, "i").test(event.title);
      expect(match).toBe(false);
    });
  });

  it("should contain personal fallback notice in Korean if fallback data was utilized", () => {
    const fallbackResult = {
      triggered: true,
      zScore: 2.4,
      returnPercent: 4.5,
      meanPercent: 0.1,
      stdPercent: 1.8,
      source: "yfinance",
      sourceTier: "personal_fallback",
      dataStatus: "stale",
      warnings: [],
    };

    const ruleWithFallback = {
      ...ruleTemplate,
      dataPolicy: { ...ruleTemplate.dataPolicy, allowPersonalFallback: true },
    };

    const event = (alertEvaluator as any).createAssetEvent(ruleWithFallback, target, fallbackResult);

    expect(event.body).toContain("주의: 이 알림은 개인용 비공식 fallback 데이터를 포함합니다.");
  });
});
