import { describe, it, expect, vi } from "vitest";
import { detectTechnicalSignalChanges } from "./technical-signal-change-detector";
import { getTechnicalSignalSnapshot, getFactorValues } from "../../factors/factor-store";
import { getSignalHistory } from "../../signals/signal-history-store";

vi.mock("../../factors/factor-store", () => ({
  getTechnicalSignalSnapshot: vi.fn(),
  getFactorValues: vi.fn(),
}));

vi.mock("../../signals/signal-history-store", () => ({
  getSignalHistory: vi.fn(),
}));

describe("technical-signal-change-detector", () => {
  it("should return empty array when snapshot has no assets", async () => {
    vi.mocked(getTechnicalSignalSnapshot).mockResolvedValue(null);
    vi.mocked(getFactorValues).mockResolvedValue([]);
    vi.mocked(getSignalHistory).mockResolvedValue([]);

    const events = await detectTechnicalSignalChanges({ universeId: "KOSPI_SAMPLE" });
    expect(events).toEqual([]);
  });

  it("should detect momentum score change, label change, and downgrade", async () => {
    // Current snapshot: score is 35 (Label: "검토"), tension false, date is 2026-06-18
    const snapshot = {
      updatedAt: "2026-06-18T09:00:00Z",
      assets: {
        "KR:005930": {
          symbol: "005930",
          nameKo: "삼성전자",
          nameEn: "Samsung Electronics",
          momentum: {
            factorValue: {
              rawValue: -35, // Current score (Label: "주의")
              dataStatus: "real_time",
            },
            crossHorizonTension: {
              detected: false,
            },
          },
        },
      },
    };

    // History: previous score was 35 (Label: "검토") on 2026-06-17
    const historyFactors = [
      {
        assetId: "KR:005930",
        factorId: "momentum",
        rawValue: 35,
        dataStatus: "real_time",
        dataAvailableAt: "2026-06-17T09:00:00Z",
      },
    ];

    vi.mocked(getTechnicalSignalSnapshot).mockResolvedValue(snapshot);
    vi.mocked(getFactorValues).mockResolvedValue(historyFactors as any);
    vi.mocked(getSignalHistory).mockResolvedValue([]);

    const events = await detectTechnicalSignalChanges({ universeId: "KOSPI_SAMPLE" });

    // We expect:
    // 1. score change (35 to -35 is change of 70, >= 30) -> momentum_score_change
    // 2. label change ("검토" to "주의") -> momentum_score_change
    // 3. downgrade ("검토" to "주의") -> technical_signal_change with severity warning
    expect(events.length).toBeGreaterThanOrEqual(3);

    const scoreChange = events.find((e) => e.ruleType === "momentum_score_change" && e.id.includes("score"));
    expect(scoreChange).toBeDefined();
    expect(scoreChange?.severity).toBe("watch");
    expect(scoreChange?.messageKo).toContain("이전 35에서 현재 -35로 급변");

    const labelChange = events.find((e) => e.ruleType === "momentum_score_change" && e.id.includes("label"));
    expect(labelChange).toBeDefined();
    expect(labelChange?.severity).toBe("info");
    expect(labelChange?.messageKo).toContain("모멘텀 진단 상태가 이전 '검토'에서 현재 '주의' 상태로 변경");

    const levelDowngrade = events.find((e) => e.ruleType === "technical_signal_change" && e.id.includes("downgrade"));
    expect(levelDowngrade).toBeDefined();
    expect(levelDowngrade?.severity).toBe("warning");
    expect(levelDowngrade?.messageKo).toContain("모멘텀 진단 단계가 '검토'에서 '주의' 수준으로 하락");
  });

  it("should detect trend tension when current is tension and previous was not", async () => {
    // Current snapshot: tension detected
    const snapshot = {
      updatedAt: "2026-06-18T09:00:00Z",
      assets: {
        "KR:005930": {
          symbol: "005930",
          nameKo: "삼성전자",
          momentum: {
            factorValue: {
              rawValue: 0,
              dataStatus: "real_time",
            },
            crossHorizonTension: {
              detected: true,
            },
          },
        },
      },
    };

    // Previous factor value on 2026-06-17
    const historyFactors = [
      {
        assetId: "KR:005930",
        factorId: "momentum",
        rawValue: 0,
        dataStatus: "real_time",
        dataAvailableAt: "2026-06-17",
      },
    ];

    // Previous atomic signal history has same sentiment for short & long (no tension)
    const signalHistory = [
      {
        assetId: "KR:005930",
        date: "2026-06-17",
        signal: {
          factorId: "macd",
          horizon: "short",
          score: 40, // bullish
        },
      },
      {
        assetId: "KR:005930",
        date: "2026-06-17",
        signal: {
          factorId: "rsi",
          horizon: "long",
          score: 40, // bullish (no tension with short bullish)
        },
      },
    ];

    vi.mocked(getTechnicalSignalSnapshot).mockResolvedValue(snapshot);
    vi.mocked(getFactorValues).mockResolvedValue(historyFactors as any);
    vi.mocked(getSignalHistory).mockResolvedValue(signalHistory as any);

    const events = await detectTechnicalSignalChanges({ universeId: "KOSPI_SAMPLE" });
    const tensionEvent = events.find((e) => e.id.includes("tension"));
    expect(tensionEvent).toBeDefined();
    expect(tensionEvent?.ruleType).toBe("technical_signal_change");
    expect(tensionEvent?.severity).toBe("watch");
    expect(tensionEvent?.messageKo).toContain("단기 추세와 장기 추세의 불일치(상충)가 신규 감지");
  });

  it("should detect restored data capability from insufficient to real_time", async () => {
    const snapshot = {
      updatedAt: "2026-06-18T09:00:00Z",
      assets: {
        "KR:005930": {
          symbol: "005930",
          momentum: {
            factorValue: {
              rawValue: 10,
              dataStatus: "real_time",
            },
          },
        },
      },
    };

    const historyFactors = [
      {
        assetId: "KR:005930",
        factorId: "momentum",
        rawValue: null,
        dataStatus: "insufficient_data",
        dataAvailableAt: "2026-06-17",
      },
    ];

    vi.mocked(getTechnicalSignalSnapshot).mockResolvedValue(snapshot);
    vi.mocked(getFactorValues).mockResolvedValue(historyFactors as any);
    vi.mocked(getSignalHistory).mockResolvedValue([]);

    const events = await detectTechnicalSignalChanges({ universeId: "KOSPI_SAMPLE" });
    const restoredEvent = events.find((e) => e.ruleType === "data_quality");
    expect(restoredEvent).toBeDefined();
    expect(restoredEvent?.severity).toBe("info");
    expect(restoredEvent?.messageKo).toContain("충분한 데이터가 공급되어 기술적 진단이 가능");
  });
});
