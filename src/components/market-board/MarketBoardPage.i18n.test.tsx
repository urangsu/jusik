import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketBoardPage } from "./MarketBoardPage";
import { I18nProvider } from "@/i18n/use-i18n";
import { getDefaultSnapshot } from "@/domain/market-board/market-board-snapshot";

describe("MarketBoardPage i18n Verification", () => {
  it("should have no untranslated UI labels in Korean mode", () => {
    const snapshot = getDefaultSnapshot("KOSPI_SAMPLE");
    // Ensure fallback banner triggers to test its labels too
    if (snapshot.tiles.length > 0) {
      snapshot.tiles[0].sourceTier = "personal_fallback";
    }

    render(
      <I18nProvider initialLocale="ko">
        <MarketBoardPage initialSnapshot={snapshot} />
      </I18nProvider>
    );

    // Forbidden raw English labels
    const forbiddenLabels = [
      "Price",
      "Volume",
      "Provider",
      "Warning",
      "Market Cap",
      "Dividend Yield",
      "Data Source",
      "API Required",
      "Personal Use Only",
    ];

    forbiddenLabels.forEach((label) => {
      // We look for elements that exactly match these English texts
      const elements = screen.queryAllByText((content) => content.trim() === label);
      expect(elements.length).toBe(0);
    });

    // Whitelisted acronyms and proper names must remain allowed
    expect(screen.getAllByText("PER").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PBR").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ROE").length).toBeGreaterThan(0);
  });
});
