import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StdDevSignalCard } from "./StdDevSignalCard";
import { StdDevSignal } from "@/domain/strategy/stddev-signal";

const insufficientSignal: StdDevSignal = {
  assetId: "KR:005930",
  symbol: "005930",
  date: "2026-06-16",
  window: 20,
  lastPrice: null,
  movingAverage: null,
  standardDeviation: null,
  zScore: null,
  upper1: null,
  upper2: null,
  upper3: null,
  lower1: null,
  lower2: null,
  lower3: null,
  position: "insufficient_data",
  direction: "insufficient_data",
  signalStrength: null,
  status: "insufficient_data",
  dataQualityScore: 0,
  vetoReasons: ["가격 OHLCV API 필요"],
  explanation: "가격 데이터가 부족해 통계적 위치를 계산하지 않습니다.",
};

describe("StdDevSignalCard", () => {
  it("does not render numbers when status is insufficient_data", () => {
    render(<StdDevSignalCard signal={insufficientSignal} />);

    expect(screen.getAllByText("데이터 부족").length).toBeGreaterThan(0);
    expect(screen.queryByText("0")).toBeNull();
  });

  it("renders API-required context through veto reasons", () => {
    render(<StdDevSignalCard signal={insufficientSignal} />);

    expect(screen.getByText("가격 OHLCV API 필요")).toBeInTheDocument();
  });

  it("does not display direct trade instruction phrases in the stddev signal card", () => {
    const { container } = render(<StdDevSignalCard signal={insufficientSignal} />);

    const disallowed = new RegExp(`매수\\s*확정|매도\\s*확정|매수\\s*추천|매도\\s*추천`);
    expect(container.textContent).not.toMatch(disallowed);
  });
});
