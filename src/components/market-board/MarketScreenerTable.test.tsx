import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarketScreenerTable } from "./MarketScreenerTable";
import { MarketScreenerRow } from "@/domain/market-board/market-screener-row";

describe("MarketScreenerTable Component", () => {
  const mockRows: MarketScreenerRow[] = [
    {
      assetId: "US:AAPL",
      symbol: "AAPL",
      name: "Apple",
      sector: "Technology",
      industry: "Hardware",
      price: 180,
      changePercent: 1.5,
      volume: 1000000,
      turnover: 180000000,
      marketCap: 2000000000000,
      high52WeekPercent: -5.5,
      return20Day: 3.2,
      return60Day: 10.4,
      per: 29.5,
      pbr: 38.2,
      roe: 154.2,
      dividendYield: 0.5,
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
      price: null,
      changePercent: null,
      volume: null,
      turnover: null,
      marketCap: null,
      high52WeekPercent: null,
      return20Day: null,
      return60Day: null,
      per: null,
      pbr: null,
      roe: null,
      dividendYield: null,
      dataStatus: "api_required",
      source: "FMP Free",
      sourceTier: "free_limited",
      warnings: [],
      updatedAt: "2026-06-16T00:00:00Z"
    }
  ];

  it("should render table headers and row cells", () => {
    render(<MarketScreenerTable rows={mockRows} />);
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("TSLA")).toBeInTheDocument();
    expect(screen.getByText("Tesla")).toBeInTheDocument();
  });

  it("should render API Required badge for null values and never render 0", () => {
    render(<MarketScreenerTable rows={mockRows} />);
    const apiRequiredElements = screen.getAllByText("API 필요");
    expect(apiRequiredElements.length).toBeGreaterThan(0);

    const zeroElement = screen.queryByText("0원");
    expect(zeroElement).toBeNull();
  });
});
