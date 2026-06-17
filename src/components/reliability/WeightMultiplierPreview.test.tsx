import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { I18nProvider } from "../../i18n/use-i18n";
import { WeightMultiplierPreview } from "./WeightMultiplierPreview";
import { ReliabilityAdjustedMomentumPreview } from "../../domain/reliability/reliability-adjusted-momentum";

describe("WeightMultiplierPreview", () => {
  const mockPreview: ReliabilityAdjustedMomentumPreview = {
    assetId: "A1",
    universeId: "KOSPI_SAMPLE",
    baseMomentumScore: 10,
    reliabilityAdjustedScore: 15,
    baseLabel: "neutral",
    reliabilityAdjustedLabel: "neutral",
    appliedMultipliers: [
      {
        signalId: "momentum_ichimoku",
        baseWeight: 0.15,
        reliabilityWeightMultiplier: 1.25,
        effectiveWeight: 0.1875,
        reason: "usable",
      },
      {
        signalId: "momentum_darvas",
        baseWeight: 0.10,
        reliabilityWeightMultiplier: null,
        effectiveWeight: null,
        reason: "insufficient_sample",
      },
    ],
    warnings: ["not_for_investment_decision"],
    calculatedAt: "2026-06-17T12:00:00Z",
  };

  it("renders base versus adjusted scores and component multipliers", () => {
    render(
      <I18nProvider initialLocale="ko">
        <WeightMultiplierPreview preview={mockPreview} />
      </I18nProvider>
    );

    // Displays the scores
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();

    // Displays signals
    expect(screen.getByText("일목균형표 모멘텀")).toBeInTheDocument();
    expect(screen.getByText("다윈 박스 모멘텀")).toBeInTheDocument();

    // Displays reason/multiplier status
    expect(screen.getByText("적정 (제한 보정)")).toBeInTheDocument();
    expect(screen.getByText("표본 부족 (기본값 적용)")).toBeInTheDocument();
  });
});
