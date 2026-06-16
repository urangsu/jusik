"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MarketUniverseId } from "@/domain/universe/market-universe";
import { MarketBoardSnapshot, getDefaultSnapshot } from "@/domain/market-board/market-board-snapshot";
import { UniverseToggle } from "./UniverseToggle";
import { MarketBoardToolbar } from "./MarketBoardToolbar";
import { MarketHeatmap } from "./MarketHeatmap";
import { MarketScreenerTable } from "./MarketScreenerTable";
import { MarketBoardDiagnostics } from "./MarketBoardDiagnostics";
import { LayoutGrid } from "lucide-react";

interface MarketBoardPageProps {
  initialSnapshot?: MarketBoardSnapshot;
}

export const MarketBoardPage: React.FC<MarketBoardPageProps> = ({ initialSnapshot }) => {
  const [activeUniverseId, setActiveUniverseId] = useState<MarketUniverseId>(
    initialSnapshot?.universeId || "KOSPI_SAMPLE"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [dataSourceFilter, setDataSourceFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("MARKET_CAP");

  const [snapshot, setSnapshot] = useState<MarketBoardSnapshot>(
    initialSnapshot || getDefaultSnapshot(activeUniverseId)
  );

  // Fetch updated snapshot when universeId changes
  useEffect(() => {
    let active = true;
    async function fetchSnapshot() {
      try {
        const res = await fetch(`/api/markets/snapshot?universeId=${activeUniverseId}`);
        if (!res.ok) throw new Error("Failed to fetch snapshot");
        const data = await res.json();
        if (active) {
          setSnapshot(data);
        }
      } catch (err) {
        console.error("Failed to load snapshot from API, using default static", err);
        if (active) {
          setSnapshot(getDefaultSnapshot(activeUniverseId));
        }
      }
    }
    fetchSnapshot();
    return () => {
      active = false;
    };
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

    // Data source filter
    if (dataSourceFilter === "OFFICIAL_ONLY") {
      result = result.filter(
        (t) =>
          t.sourceTier === "official" ||
          t.sourceTier === "free_limited" ||
          t.sourceTier === "licensed_free"
      );
    } else if (dataSourceFilter === "EXCLUDE_FALLBACK") {
      result = result.filter((t) => t.sourceTier !== "personal_fallback");
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
  }, [snapshot, searchQuery, selectedSector, dataSourceFilter, sortBy]);

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

    // Data source filter
    if (dataSourceFilter === "OFFICIAL_ONLY") {
      result = result.filter(
        (r) =>
          r.sourceTier === "official" ||
          r.sourceTier === "free_limited" ||
          r.sourceTier === "licensed_free"
      );
    } else if (dataSourceFilter === "EXCLUDE_FALLBACK") {
      result = result.filter((r) => r.sourceTier !== "personal_fallback");
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
  }, [snapshot, searchQuery, selectedSector, dataSourceFilter, sortBy]);

  const hasFallbackData = useMemo(() => {
    return snapshot.tiles.some((t) => t.sourceTier === "personal_fallback");
  }, [snapshot]);

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

      {/* Snapshot Provenance Banner */}
      {hasFallbackData && (
        <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-3.5 rounded-kt-card text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-kt-text-secondary leading-relaxed">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-kt-positive flex-shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-kt-text-primary">데이터 출처: </span>
              <span>Yahoo Finance via yfinance</span>
              <span className="mx-2 text-kt-border-panel">|</span>
              <span className="font-bold text-kt-text-primary">상태: </span>
              <span className="text-kt-positive-text font-medium">비공식 개인용 fallback</span>
              <span className="mx-2 text-kt-border-panel">|</span>
              <span className="font-bold text-kt-text-primary">기준 시각: </span>
              <span className="tabular-nums">{new Date(snapshot.generatedAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="text-[10px] text-kt-text-muted border-t sm:border-t-0 sm:border-l border-kt-border-panel pt-2 sm:pt-0 sm:pl-3">
            주의: 공식/상용 데이터가 아닙니다. 개인 연구 목적 외 배포 금지.
          </div>
        </div>
      )}

      {/* Toolbar */}
      <MarketBoardToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSector={selectedSector}
        onSectorChange={setSelectedSector}
        sectors={sectors}
        sortBy={sortBy}
        onSortChange={setSortBy}
        dataSourceFilter={dataSourceFilter}
        onDataSourceFilterChange={setDataSourceFilter}
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
