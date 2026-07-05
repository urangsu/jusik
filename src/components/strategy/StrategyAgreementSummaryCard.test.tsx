import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { StrategyAgreementSummaryCard } from "./StrategyAgreementSummaryCard";
import { StrategyAgreementSignal } from "@/domain/strategy/strategy-agreement-signal";

const insufficientAgreement: StrategyAgreementSignal = {
  assetId: "", // Empty string disables async fetch in useEffect for this test signal
  symbol: "005930",
  date: "2026-06-16",
  agreementScore: null,
  agreementLabel: "insufficient_data",
  agreementRate: null,
  participatingViews: [],
  excludedViews: [{ strategyId: "stddev_mean_reversion", reason: "가격 OHLCV API 필요" }],
  topBullishFactors: [],
  topBearishFactors: [],
  vetoReasons: ["참여 가능한 전략 데이터가 3개 미만입니다."],
  status: "insufficient_data",
  dataQualityScore: 0,
  explanation: "전략 합의 불가 / 데이터 부족",
};

const mockSignal: StrategyAgreementSignal = {
  ...insufficientAgreement,
  assetId: "KR:005930", // Triggers fetch
  signalId: "custom_factor", // Non-momentum signalId
  agreementScore: 82,
  agreementLabel: "strong_watch",
  agreementRate: 80,
  status: "real_time",
  dataQualityScore: 88,
  explanation: "여러 전략이 같은 방향을 가리킵니다.",
};

let mockStabilityResponse: any = null;
let mockSuitabilityResponse: any = null;
let lastStabilityUrl: string | null = null;
let lastSuitabilityUrl: string | null = null;

const originalFetch = global.fetch;

beforeEach(() => {
  lastStabilityUrl = null;
  lastSuitabilityUrl = null;
  mockStabilityResponse = {
    status: "cached",
    value: {
      assetId: "KR:005930",
      signalId: "custom_factor",
      date: "2026-07-05",
      consecutiveObservations: 5,
      flipCount30d: 0,
      rankAutocorrelation: 0.8,
      status: "passed",
      actionableThresholdMet: true,
      warnings: [],
    }
  };

  mockSuitabilityResponse = {
    status: "cached",
    value: {
      assetId: "KR:005930",
      symbol: "005930",
      date: "2026-07-05",
      signalId: "custom_factor",
      suitabilityScore: 82,
      originalLabel: "strong_watch",
      adjustedLabel: "strong_watch",
      regimeGate: {
        market: "KR",
        regime: "neutral",
        allowsNewWatch: true,
        allowsRiskUpgrading: true,
        confidence: "high",
        warning: null,
      },
      warnings: [],
    }
  };

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/signals/stability")) {
      lastStabilityUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockStabilityResponse),
      });
    }
    if (url.includes("/api/strategy/suitability")) {
      lastSuitabilityUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockSuitabilityResponse),
      });
    }
    return Promise.reject(new Error("Unknown fetch url: " + url));
  }) as any;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("StrategyAgreementSummaryCard", () => {
  it("does not render numeric scores when data is insufficient", () => {
    render(<StrategyAgreementSummaryCard signal={insufficientAgreement} />);

    expect(screen.getByText("전략 합의 불가")).toBeInTheDocument();
    expect(screen.queryByText("82")).toBeNull();
  });

  it("does not label strong_watch as a trade recommendation", async () => {
    render(<StrategyAgreementSummaryCard signal={mockSignal} />);

    expect(screen.getByText("검토 우선")).toBeInTheDocument();
    const disallowed = new RegExp(`매수\\s*추천|강력\\s*매수`);
    expect(screen.queryByText(disallowed)).toBeNull();

    await screen.findByText("STABLE");
  });

  it("renders the investment advice disclaimer", () => {
    render(<StrategyAgreementSummaryCard signal={insufficientAgreement} />);

    expect(
      screen.getByText("이 화면은 여러 전략 신호의 합의 정도를 보여주는 진단 도구이며, 거래 지시가 아닙니다."),
    ).toBeInTheDocument();
  });

  it("renders an explicit missing-data state instead of score cells when agreement cannot be calculated", () => {
    render(<StrategyAgreementSummaryCard signal={insufficientAgreement} />);

    expect(screen.getByText("전략 합의 계산 불가")).toBeInTheDocument();
    expect(screen.getByText("필요 데이터가 아직 연결되지 않았습니다.")).toBeInTheDocument();
    expect(screen.getByText("현재 상태: 데이터 부족")).toBeInTheDocument();
    expect(screen.queryByText("합의 점수")).toBeNull();
  });

  it("does not render expected alpha wording or return percentages", () => {
    render(<StrategyAgreementSummaryCard signal={insufficientAgreement} />);
    const expectedReturnPattern = new RegExp(
      [
        `예상 초과${"수익률"}`,
        `예상 ${"수익률"}`,
        `기대${"수익률"}`,
        "연환산",
      ].join("|"),
    );

    expect(screen.queryByText(/expected alpha/i)).toBeNull();
    expect(screen.queryByText(expectedReturnPattern)).toBeNull();
  });

  it("renders STABLE badge and consecutive observations correctly on stability status='passed'", async () => {
    render(<StrategyAgreementSummaryCard signal={mockSignal} />);

    expect(await screen.findByText("STABLE")).toBeInTheDocument();
    expect(screen.getByText("5회 (기준 ≥ 3회)")).toBeInTheDocument();
    expect(screen.queryByText(/Trading Session/)).toBeNull();
    expect(screen.queryByText(/Days/)).toBeNull();

    // Verify non-momentum signalId propagation
    expect(lastStabilityUrl).toContain("signalId=custom_factor");
    expect(lastSuitabilityUrl).toContain("signalId=custom_factor");
    // Verify asOf date propagation from signal
    expect(lastStabilityUrl).toContain("date=2026-06-16");
    expect(lastSuitabilityUrl).toContain("asOf=2026-06-16");
  });

  it("renders BLOCKED badge and stability warnings on stability status='blocked'", async () => {
    mockStabilityResponse.value.status = "blocked";
    mockStabilityResponse.value.actionableThresholdMet = false;
    mockStabilityResponse.value.warnings = ["signal_not_persistent"];

    render(<StrategyAgreementSummaryCard signal={mockSignal} />);

    expect(await screen.findByText("BLOCKED")).toBeInTheDocument();
    expect(screen.getByText("신호 최소 유지 조건 미달 (최근 동일 신호 3회 미만)")).toBeInTheDocument();
  });

  it("renders INSUFFICIENT DATA badge on stability status='insufficient_data'", async () => {
    mockStabilityResponse.value.status = "insufficient_data";
    mockStabilityResponse.value.actionableThresholdMet = false;
    mockStabilityResponse.value.warnings = ["insufficient_signal_history"];

    render(<StrategyAgreementSummaryCard signal={mockSignal} />);

    expect(await screen.findByText("INSUFFICIENT DATA")).toBeInTheDocument();
  });

  it("realistic test: does not show scores when agreementScore=null but assetId is present", async () => {
    let resolveStability: any = null;
    const stabilityPromise = new Promise((resolve) => {
      resolveStability = resolve;
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/signals/stability")) {
        return Promise.resolve({
          ok: true,
          json: () => {
            resolveStability();
            return Promise.resolve(mockStabilityResponse);
          },
        });
      }
      if (url.includes("/api/strategy/suitability")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSuitabilityResponse),
        });
      }
      return Promise.reject(new Error("Unknown fetch url: " + url));
    }) as any;

    const nullScoreWithAssetSignal: StrategyAgreementSignal = {
      ...insufficientAgreement,
      assetId: "KR:005930", // triggers fetch
      agreementScore: null,
      status: "insufficient_data",
    };

    render(<StrategyAgreementSummaryCard signal={nullScoreWithAssetSignal} />);

    // Renders calculation blocked
    expect(screen.getByText("전략 합의 계산 불가")).toBeInTheDocument();
    expect(screen.queryByText("합의 점수")).toBeNull();

    // Wait for stability fetch to resolve in background
    await stabilityPromise;

    // Settle React state updates
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Scores must still NOT be displayed
    expect(screen.queryByText("합의 점수")).toBeNull();
  });
});
