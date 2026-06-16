import { describe, expect, it } from "vitest";
import { calculateStrategyAgreementSignal } from "./calculate-strategy-agreement-signal";
import { StrategyViewScore } from "./strategy-view";

const makeView = (
  overrides: Partial<StrategyViewScore> & Pick<StrategyViewScore, "strategyId">,
): StrategyViewScore => ({
  assetId: "KR:005930",
  symbol: "005930",
  date: "2026-06-16",
  displayName: "전략",
  score: 80,
  signal: "positive_watch",
  confidence: "medium",
  status: "real_time",
  dataQualityScore: 90,
  bullishFactors: ["가격 조건"],
  bearishFactors: [],
  vetoReasons: [],
  explanation: "진단 가능",
  ...overrides,
});

describe("calculateStrategyAgreementSignal", () => {
  it("returns insufficient_data when fewer than three views can participate", () => {
    const signal = calculateStrategyAgreementSignal({
      assetId: "KR:005930",
      symbol: "005930",
      date: "2026-06-16",
      views: [
        makeView({ strategyId: "stddev_mean_reversion" }),
        makeView({ strategyId: "momentum" }),
      ],
    });

    expect(signal.status).toBe("insufficient_data");
    expect(signal.agreementScore).toBeNull();
  });

  it("prevents strong_watch when average dataQualityScore is low", () => {
    const signal = calculateStrategyAgreementSignal({
      assetId: "KR:005930",
      symbol: "005930",
      date: "2026-06-16",
      views: [
        makeView({ strategyId: "macro_first_largecap", dataQualityScore: 60 }),
        makeView({ strategyId: "stddev_mean_reversion", dataQualityScore: 65 }),
        makeView({ strategyId: "momentum", dataQualityScore: 60 }),
      ],
    });

    expect(signal.agreementScore).not.toBeNull();
    expect(signal.agreementLabel).not.toBe("strong_watch");
    expect(["caution", "risk"]).toContain(signal.agreementLabel);
  });

  it("prevents strong_watch when macro_first_largecap is risk", () => {
    const signal = calculateStrategyAgreementSignal({
      assetId: "KR:005930",
      symbol: "005930",
      date: "2026-06-16",
      views: [
        makeView({ strategyId: "macro_first_largecap", signal: "risk", score: 95 }),
        makeView({ strategyId: "stddev_mean_reversion", score: 95 }),
        makeView({ strategyId: "fundamental_quant", score: 95 }),
        makeView({ strategyId: "momentum", score: 95 }),
      ],
    });

    expect(signal.agreementLabel).not.toBe("strong_watch");
    expect(signal.vetoReasons).toContain("레짐-우선 뷰가 위험 상태이므로 강한 관찰 라벨을 제한합니다.");
  });

  it("increases agreementRate when positive_watch views dominate", () => {
    const signal = calculateStrategyAgreementSignal({
      assetId: "KR:005930",
      symbol: "005930",
      date: "2026-06-16",
      views: [
        makeView({ strategyId: "macro_first_largecap" }),
        makeView({ strategyId: "stddev_mean_reversion" }),
        makeView({ strategyId: "fundamental_quant" }),
        makeView({ strategyId: "momentum", signal: "neutral", score: 55 }),
      ],
    });

    expect(signal.agreementRate).toBe(75);
  });

  it("preserves vetoReasons in the result", () => {
    const signal = calculateStrategyAgreementSignal({
      assetId: "KR:005930",
      symbol: "005930",
      date: "2026-06-16",
      views: [
        makeView({ strategyId: "macro_first_largecap", vetoReasons: ["시장 레짐 확인 필요"] }),
        makeView({ strategyId: "stddev_mean_reversion" }),
        makeView({ strategyId: "momentum" }),
      ],
    });

    expect(signal.vetoReasons).toContain("시장 레짐 확인 필요");
  });

  it("does not calculate null scores as zero", () => {
    const signal = calculateStrategyAgreementSignal({
      assetId: "KR:005930",
      symbol: "005930",
      date: "2026-06-16",
      views: [
        makeView({ strategyId: "macro_first_largecap", score: null }),
        makeView({ strategyId: "stddev_mean_reversion", score: null }),
        makeView({ strategyId: "momentum", score: 90 }),
      ],
    });

    expect(signal.status).toBe("insufficient_data");
    expect(signal.agreementScore).toBeNull();
    expect(signal.excludedViews.map((view) => view.strategyId)).toContain("macro_first_largecap");
  });

  it("returns insufficient_data before scoring when a P0 fatal veto is present", () => {
    const signal = calculateStrategyAgreementSignal({
      assetId: "KR:005930",
      symbol: "005930",
      date: "2026-06-16",
      views: [
        makeView({ strategyId: "macro_first_largecap", vetoReasons: ["P0 fatal: PIT data missing"] }),
        makeView({ strategyId: "stddev_mean_reversion" }),
        makeView({ strategyId: "momentum" }),
      ],
    });

    expect(signal.status).toBe("insufficient_data");
    expect(signal.agreementScore).toBeNull();
    expect(signal.agreementLabel).toBe("insufficient_data");
    expect(signal.vetoReasons).toContain("P0 fatal veto로 전략 합의를 계산하지 않습니다.");
  });
});
