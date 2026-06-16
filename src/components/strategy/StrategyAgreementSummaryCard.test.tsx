import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StrategyAgreementSummaryCard } from "./StrategyAgreementSummaryCard";
import { StrategyAgreementSignal } from "@/domain/strategy/strategy-agreement-signal";

const insufficientAgreement: StrategyAgreementSignal = {
  assetId: "KR:005930",
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

describe("StrategyAgreementSummaryCard", () => {
  it("does not render numeric scores when data is insufficient", () => {
    render(<StrategyAgreementSummaryCard signal={insufficientAgreement} />);

    expect(screen.getByText("전략 합의 불가")).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("does not label strong_watch as a trade recommendation", () => {
    render(
      <StrategyAgreementSummaryCard
        signal={{
          ...insufficientAgreement,
          agreementScore: 82,
          agreementLabel: "strong_watch",
          agreementRate: 80,
          status: "real_time",
          dataQualityScore: 88,
          explanation: "여러 전략이 같은 방향을 가리킵니다.",
        }}
      />,
    );

    expect(screen.getByText("검토 우선")).toBeInTheDocument();
    const disallowed = new RegExp(`매수\\s*추천|강력\\s*매수`);
    expect(screen.queryByText(disallowed)).toBeNull();
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
});
