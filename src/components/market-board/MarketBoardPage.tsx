"use client";

import React, { useState, useMemo } from "react";
import { MarketUniverseId } from "@/domain/universe/market-universe";
import { getDefaultSnapshot } from "@/domain/market-board/market-board-snapshot";
import { UniverseToggle } from "./UniverseToggle";
import { MarketBoardToolbar } from "./MarketBoardToolbar";
import { MarketHeatmap } from "./MarketHeatmap";
import { MarketScreenerTable } from "./MarketScreenerTable";
import { MarketBoardDiagnostics } from "./MarketBoardDiagnostics";
import { LayoutGrid } from "lucide-react";

export const MarketBoardPage: React.FC = () => {
  const [activeUniverseId, setActiveUniverseId] = useState<MarketUniverseId>("KOSPI_SAMPLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [sortBy, setSortBy] = useState("MARKET_CAP");

  const snapshot = useMemo(() => {
    return getDefaultSnapshot(activeUniverseId);
  }, [activeUniverseId]);

  // Extract unique sectors for options
  const sectors = useMemo(() => {
    const list = snapshot.tiles
      .map((t) => t.sector)
      .filter((s): s is string => s !== null && s !== undefined);
    return Array.from(new Set(list));
  }, [snapshot]);

  // Filter and sort tiles
  const filteredTiles = useMemo(() => {
    let result = [...snapshot.tiles];

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)
      );
    }

    // Sector filter
    if (selectedSector !== "ALL") {
      result = result.filter((t) => t.sector === selectedSector);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "MARKET_CAP") {
        return (b.marketCap || 0) - (a.marketCap || 0);
      } else if (sortBy === "CHANGE_PERCENT") {
        return (b.changePercent || 0) - (a.changePercent || 0);
      } else if (sortBy === "VOLUME") {
        return (b.volume || 0) - (a.volume || 0);
      }
      return 0;
    });

    return result;
  }, [snapshot, searchQuery, selectedSector, sortBy]);

  // Filter and sort screener rows
  const filteredRows = useMemo(() => {
    let result = [...snapshot.tableRows];

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.symbol.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q)
      );
    }

    // Sector filter
    if (selectedSector !== "ALL") {
      result = result.filter((r) => r.sector === selectedSector);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "MARKET_CAP") {
        return (b.marketCap || 0) - (a.marketCap || 0);
      } else if (sortBy === "CHANGE_PERCENT") {
        return (b.changePercent || 0) - (a.changePercent || 0);
      } else if (sortBy === "VOLUME") {
        return (b.volume || 0) - (a.volume || 0);
      }
      return 0;
    });

    return result;
  }, [snapshot, searchQuery, selectedSector, sortBy]);

  return (
    <div className="w-full min-h-screen bg-kt-bg-body flex flex-col p-6 gap-5">
      {/* Top Title Bar */}
      <div className="flex items-center justify-between border-b border-kt-border-panel/40 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-md font-bold tracking-tight text-kt-text-primary flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-kt-positive-text flex-shrink-0" />
            시장 보드 (Market Board)
          </h1>
          <p className="text-[10px] text-kt-text-muted mt-1 leading-normal">
            KOSPI와 S&P 500 대표 주식들의 실시간 데이터 수신 상태 및 밸류에이션 스크리너 대시보드입니다.
          </p>
        </div>
        <UniverseToggle
          activeUniverseId={activeUniverseId}
          onChange={(id) => {
            setActiveUniverseId(id);
            setSelectedSector("ALL"); // reset sector
          }}
        />
      </div>

      {/* Toolbar */}
      <MarketBoardToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSector={selectedSector}
        onSectorChange={setSelectedSector}
        sectors={sectors}
        sortBy={sortBy}
        onSortChange={setSortBy}
        generatedAt={snapshot.generatedAt}
      />

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Side: Heatmap (Span 2) */}
        <div className="lg:col-span-2 flex flex-col">
          <MarketHeatmap tiles={filteredTiles} />
        </div>

        {/* Right Side: Diagnostics Panel (Span 1) */}
        <div className="flex flex-col">
          <MarketBoardDiagnostics sourceSummary={snapshot.sourceSummary} />
        </div>
      </div>

      {/* Bottom Screener Table */}
      <div className="w-full">
        <MarketScreenerTable rows={filteredRows} />
      </div>
    </div>
  );
};
