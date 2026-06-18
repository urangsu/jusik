"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MarketUniverseId } from "@/domain/universe/market-universe";
import { MarketBoardSnapshot, getDefaultSnapshot } from "@/domain/market-board/market-board-snapshot";
import { UniverseToggle } from "./UniverseToggle";
import { MarketBoardHeader } from "./MarketBoardHeader";
import { MarketBoardToolbar } from "./MarketBoardToolbar";
import { MarketHeatmap } from "./MarketHeatmap";
import { MarketScreenerTable } from "./MarketScreenerTable";
import { MarketBoardDiagnostics } from "./MarketBoardDiagnostics";
import { MomentumFactorPanel } from "../factors/MomentumFactorPanel";
import { LocaleToggle } from "../settings/LocaleToggle";
import { useI18n } from "@/i18n/use-i18n";
import { LayoutGrid } from "lucide-react";

interface MarketBoardPageProps {
  initialSnapshot?: MarketBoardSnapshot;
}

export const MarketBoardPage: React.FC<MarketBoardPageProps> = ({ initialSnapshot }) => {
  const { t, locale } = useI18n();

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

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [technicalSnapshot, setTechnicalSnapshot] = useState<any>(null);

  // Reset selected asset when universe changes
  useEffect(() => {
    setSelectedAssetId(null);
  }, [activeUniverseId]);

  // Fetch technical signals snapshot when universe changes
  useEffect(() => {
    let active = true;
    async function fetchTechSnapshot() {
      try {
        const res = await fetch(`/api/factors/technical?universeId=${activeUniverseId}`);
        if (!res.ok) throw new Error("Failed to fetch technical signals");
        const envelope = await res.json();
        if (active && envelope?.status === "cached") {
          setTechnicalSnapshot(envelope.value);
        }
      } catch (err) {
        console.error("Failed to load technical signals snapshot", err);
      }
    }
    fetchTechSnapshot();
    return () => {
      active = false;
    };
  }, [activeUniverseId]);

  // Compute momentum scores map for screener columns
  const momentumScores = useMemo(() => {
    if (!technicalSnapshot?.assets) return undefined;
    const scores: Record<string, { short: number | null; medium: number | null; long: number | null }> = {};
    for (const [assetId, assetData] of Object.entries(technicalSnapshot.assets)) {
      const byHorizon = (assetData as any).momentum?.byHorizon;
      if (byHorizon) {
        scores[assetId] = {
          short: byHorizon.short?.score ?? null,
          medium: byHorizon.medium?.score ?? null,
          long: byHorizon.long?.score ?? null,
        };
      }
    }
    return scores;
  }, [technicalSnapshot]);

  // Compute selected asset's technical detailed data
  const selectedAssetData = useMemo(() => {
    if (!selectedAssetId || !technicalSnapshot?.assets?.[selectedAssetId]) return null;
    const techAsset = technicalSnapshot.assets[selectedAssetId];
    const row = snapshot.tableRows.find((r) => r.assetId === selectedAssetId);
    return {
      name: row?.name || techAsset.nameKo || techAsset.symbol,
      symbol: row?.symbol || techAsset.symbol,
      dataStatus: row?.dataStatus || "cached",
      sourceTier: row?.sourceTier || "personal_fallback",
      warnings: row?.warnings || [],
      ...techAsset,
    };
  }, [selectedAssetId, technicalSnapshot, snapshot]);

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
            {t("marketBoard")}
          </h1>
          <p className="text-[10px] text-kt-text-muted mt-1 leading-normal">
            {t("marketBoardDesc")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LocaleToggle />
          <UniverseToggle
            activeUniverseId={activeUniverseId}
            onChange={(id) => {
              setActiveUniverseId(id);
              setSelectedSector("ALL"); // reset sector
            }}
          />
        </div>
      </div>

      {/* Snapshot Provenance Banner */}
      {hasFallbackData && (
        <div className="bg-kt-bg-surface-100 border border-kt-border-panel p-3.5 rounded-kt-card text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-kt-text-secondary leading-relaxed">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-kt-positive flex-shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-kt-text-primary">{t("dataSource")}</span>
              <span>Yahoo Finance via yfinance</span>
              <span className="mx-2 text-kt-border-panel">|</span>
              <span className="font-bold text-kt-text-primary">{t("status")}</span>
              <span className="text-kt-positive-text font-medium">{t("personalFallbackStatus")}</span>
              <span className="mx-2 text-kt-border-panel">|</span>
              <span className="font-bold text-kt-text-primary">{t("generatedAt")}</span>
              <span className="tabular-nums">
                {new Date(snapshot.generatedAt).toLocaleString(locale === "ko" ? "ko-KR" : "en-US")}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-kt-text-muted border-t sm:border-t-0 sm:border-l border-kt-border-panel pt-2 sm:pt-0 sm:pl-3">
            {t("fallbackWarning")}
          </div>
        </div>
      )}

      {/* Macro Regime & Sentiment Panels */}
      <MarketBoardHeader />

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

        {/* Right Side: Diagnostics or Momentum Detail Panel */}
        <div className="flex flex-col relative min-h-[480px]">
          {selectedAssetData ? (
            <>
              <button
                onClick={() => setSelectedAssetId(null)}
                className="absolute top-4 right-4 text-[10px] font-semibold text-kt-text-muted hover:text-kt-text-primary border border-kt-border-panel/40 px-2 py-0.5 rounded-kt-card bg-kt-bg-surface-200 cursor-pointer z-10"
              >
                {locale === "ko" ? "닫기" : "Close"}
              </button>
              <MomentumFactorPanel
                assetName={selectedAssetData.name}
                symbol={selectedAssetData.symbol}
                momentumResult={selectedAssetData.momentum}
                atomicSignals={selectedAssetData.atomicSignals}
                dataStatus={selectedAssetData.dataStatus}
                sourceTier={selectedAssetData.sourceTier}
                warnings={selectedAssetData.warnings}
              />
            </>
          ) : (
            <MarketBoardDiagnostics sourceSummary={snapshot.sourceSummary} />
          )}
        </div>
      </div>

      {/* Bottom Screener Table */}
      <div className="w-full">
        <MarketScreenerTable
          rows={filteredRows}
          momentumScores={momentumScores}
          onRowClick={(row) => setSelectedAssetId(row.assetId)}
        />
      </div>
    </div>
  );
};
