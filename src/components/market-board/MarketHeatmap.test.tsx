import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketHeatmap } from "./MarketHeatmap";
import { MarketMapTile } from "@/domain/market-board/market-map-tile";
import { I18nProvider } from "@/i18n/use-i18n";

describe("MarketHeatmap Component", () => {
  const mockTiles: MarketMapTile[] = [
    {
      assetId: "US:AAPL",
      symbol: "AAPL",
      name: "Apple",
      sector: "Technology",
      industry: "Hardware",
      price: 180,
      changePercent: 1.5,
      marketCap: 2000000000000,
      weight: null,
      volume: 1000000,
      tileSizeMetric: "market_cap",
      dataStatus: "cached",
      source: "FMP Free",
      sourceTier: "free_limited",
      warnings: [],
      updatedAt: "2026-06-16T00:00:00Z"
    },
    {
      assetId: "US:TSLA",
      symbol: "TSLA",
      name: "Tesla",
      sector: "Automotive",
      industry: "Autos",
      price: 170,
      changePercent: -2.3,
      marketCap: 500000000000,
      weight: null,
      volume: 2000000,
      tileSizeMetric: "market_cap",
      dataStatus: "cached",
      source: "yfinance",
      sourceTier: "personal_fallback",
      warnings: ["unofficial"],
      updatedAt: "2026-06-16T00:00:00Z"
    }
  ];

  it("should render grouped sector names and stock tiles", () => {
    render(
      <I18nProvider initialLocale="en">
        <MarketHeatmap tiles={mockTiles} />
      </I18nProvider>
    );
    expect(screen.getByText("Information Technology")).toBeInTheDocument();
    expect(screen.getByText("Automotive")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("TSLA")).toBeInTheDocument();
  });
});
