import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { I18nProvider } from "../../i18n/use-i18n";
import { SignalReliabilityTable } from "./SignalReliabilityTable";
import { SignalReliabilityRecord } from "../../domain/reliability/signal-reliability-record";

describe("SignalReliabilityTable", () => {
  const mockRecords: SignalReliabilityRecord[] = [
    {
      id: "KOSPI_SAMPLE_momentum_ichimoku_1m",
      signalId: "momentum_ichimoku",
      universeId: "KOSPI_SAMPLE",
      horizon: "1m",
      sampleSize: 15,
      sampleStatus: "usable",
      avgForwardReturn: 0.02,
      avgExcessReturn: 0.01,
      positiveRate: 0.6,
      hitRate: 0.55,
      spearmanIcMean: 0.08,
      spearmanIcStd: 0.04,
      icir: 2.0,
      shrunkHitRate: 0.53,
      shrunkIc: 0.05,
      reliabilityScore: 71.5,
      reliabilityLabel: "high",
      weightMultiplier: 1.25,
      warnings: ["not_for_investment_decision", "sample_universe_only"],
      calculatedAt: "2026-06-17T12:00:00Z",
      engineVersion: "1.0.0",
    },
    {
      id: "KOSPI_SAMPLE_momentum_darvas_1m",
      signalId: "momentum_darvas",
      universeId: "KOSPI_SAMPLE",
      horizon: "1m",
      sampleSize: 5, // Insufficient sample
      sampleStatus: "insufficient_sample",
      avgForwardReturn: 0.02,
      avgExcessReturn: 0.01,
      positiveRate: 0.6,
      hitRate: 0.55,
      spearmanIcMean: 0.08,
      spearmanIcStd: 0.04,
      icir: 2.0,
      shrunkHitRate: 0.53,
      shrunkIc: 0.05,
      reliabilityScore: 71.5,
      reliabilityLabel: "high",
      weightMultiplier: 1.25,
      warnings: ["insufficient_sample", "not_for_investment_decision"],
      calculatedAt: "2026-06-17T12:00:00Z",
      engineVersion: "1.0.0",
    },
  ];

  it("renders table with records and hides metrics when sample is insufficient", () => {
    render(
      <I18nProvider initialLocale="ko">
        <SignalReliabilityTable records={mockRecords} />
      </I18nProvider>
    );

    // Should display signal names
    expect(screen.getByText("일목균형표 모멘텀")).toBeInTheDocument();
    expect(screen.getByText("다윈 박스 모멘텀")).toBeInTheDocument();

    // Check first record values
    expect(screen.getByText("15")).toBeInTheDocument(); // size

    // Check insufficient sample masking on the second record
    // In Ko, it displays "표본 부족" (insufficientSample) for reliability score/label and warnings
    const insufficientLabels = screen.getAllByText("표본 부족");
    expect(insufficientLabels.length).toBeGreaterThan(0);
  });
});
